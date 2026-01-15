/**
 * Twilio Webhook Routes
 * Handles incoming webhooks from Twilio for voice and SMS
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../core/services/database';
import { RedisService } from '../core/services/redis';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();
const redisService = new RedisService();

/**
 * POST /api/v1/twilio/voice/twiml/:sessionId
 * Returns TwiML for outbound calls
 */
router.post('/voice/twiml/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    logger.info('TwiML request received', { sessionId });

    // Get session data if available
    let greeting = 'Hello, this is a payment reminder call from the accounts department.';
    let message = 'We are calling regarding an outstanding payment on your account. Please press 1 to speak with an agent, or press 2 to hear payment options.';
    
    try {
      const sessionData = await redisService.get(`session:${sessionId}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.context?.customerName) {
          greeting = `Hello ${session.context.customerName}, this is a call from the accounts department.`;
        }
        if (session.context?.customMessage) {
          message = session.context.customMessage;
        }
      }
    } catch (e) {
      logger.debug('No session data found for TwiML', { sessionId });
    }

    // Generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${greeting}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">${message}</Say>
  <Gather numDigits="1" action="/api/v1/twilio/voice/gather/${sessionId}" method="POST" timeout="10">
    <Say voice="Polly.Joanna">Press 1 to speak with an agent. Press 2 for payment options. Press 9 to be removed from our calling list.</Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't receive any input. Goodbye.</Say>
  <Hangup/>
</Response>`;

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    logger.error('Failed to generate TwiML', { error });
    
    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We are experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

/**
 * POST /api/v1/twilio/voice/gather/:sessionId
 * Handles DTMF input from calls
 */
router.post('/voice/gather/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { Digits, CallSid } = req.body;
    
    logger.info('DTMF received', { sessionId, digits: Digits, callSid: CallSid });

    let twiml = '';

    switch (Digits) {
      case '1':
        // Transfer to agent
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while we connect you with an agent.</Say>
  <Dial timeout="30" callerId="${process.env.TWILIO_PHONE_NUMBER}">
    <Number>${process.env.AGENT_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER}</Number>
  </Dial>
  <Say voice="Polly.Joanna">We were unable to connect you. Please try again later.</Say>
  <Hangup/>
</Response>`;
        break;
        
      case '2':
        // Payment options
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you. Here are your payment options.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">Option 1: Pay the full balance today and receive a 5% discount.</Say>
  <Say voice="Polly.Joanna">Option 2: Set up a payment plan with monthly installments.</Say>
  <Say voice="Polly.Joanna">Option 3: Request a callback from our accounts team.</Say>
  <Pause length="1"/>
  <Gather numDigits="1" action="/api/v1/twilio/voice/payment/${sessionId}" method="POST" timeout="10">
    <Say voice="Polly.Joanna">Press 1, 2, or 3 to select an option. Press 0 to repeat.</Say>
  </Gather>
  <Hangup/>
</Response>`;
        break;
        
      case '9':
        // Opt-out / DNC request
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">You have been removed from our calling list. You will no longer receive calls from us. Goodbye.</Say>
  <Hangup/>
</Response>`;
        
        // Record opt-out
        try {
          await recordOptOut(CallSid, sessionId, 'phone');
        } catch (e) {
          logger.error('Failed to record opt-out', { error: e });
        }
        break;
        
      default:
        // Invalid input
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Invalid selection. Please try again.</Say>
  <Redirect>/api/v1/twilio/voice/twiml/${sessionId}</Redirect>
</Response>`;
    }

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    logger.error('Failed to handle DTMF', { error });
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
});

/**
 * POST /api/v1/twilio/voice/payment/:sessionId
 * Handles payment option selection
 */
router.post('/voice/payment/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { Digits, CallSid } = req.body;
    
    logger.info('Payment option selected', { sessionId, digits: Digits, callSid: CallSid });

    let twiml = '';

    switch (Digits) {
      case '1':
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for choosing to pay in full. You will receive an SMS with payment instructions shortly.</Say>
  <Say voice="Polly.Joanna">Thank you for your prompt attention to this matter. Goodbye.</Say>
  <Hangup/>
</Response>`;
        // Trigger SMS with payment link
        await recordCallOutcome(CallSid, sessionId, 'payment_full', { sendPaymentSMS: true });
        break;
        
      case '2':
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you. A member of our team will contact you within 24 hours to set up a payment plan.</Say>
  <Say voice="Polly.Joanna">Goodbye.</Say>
  <Hangup/>
</Response>`;
        await recordCallOutcome(CallSid, sessionId, 'payment_plan', { scheduleCallback: true });
        break;
        
      case '3':
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We will schedule a callback for you. A member of our team will call you within 2 business days.</Say>
  <Say voice="Polly.Joanna">Goodbye.</Say>
  <Hangup/>
</Response>`;
        await recordCallOutcome(CallSid, sessionId, 'callback_requested', { scheduleCallback: true });
        break;
        
      default:
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Invalid selection.</Say>
  <Redirect>/api/v1/twilio/voice/gather/${sessionId}</Redirect>
</Response>`;
    }

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    logger.error('Failed to handle payment selection', { error });
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
});

/**
 * POST /api/v1/twilio/voice/status
 * Handles call status callbacks
 */
router.post('/voice/status', async (req: Request, res: Response) => {
  try {
    const { 
      CallSid, 
      CallStatus, 
      CallDuration, 
      From, 
      To, 
      Direction,
      AnsweredBy 
    } = req.body;
    
    logger.info('Call status update', { 
      callSid: CallSid, 
      status: CallStatus, 
      duration: CallDuration,
      answeredBy: AnsweredBy 
    });

    // Store call status in Redis for real-time tracking
    await redisService.set(`call:${CallSid}`, JSON.stringify({
      status: CallStatus,
      duration: CallDuration,
      from: From,
      to: To,
      direction: Direction,
      answeredBy: AnsweredBy,
      updatedAt: new Date().toISOString()
    }), 86400); // 24 hour TTL

    // Update database for completed calls
    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      await dbService.query(
        `INSERT INTO contact_attempts (id, channel, status, duration, metadata, timestamp)
         VALUES (gen_random_uuid(), 'phone', $1, $2, $3, NOW())`,
        [
          CallStatus === 'completed' ? 'answered' : 'failed',
          Number.parseInt(CallDuration || '0', 10),
          JSON.stringify({ callSid: CallSid, answeredBy: AnsweredBy, from: From, to: To })
        ]
      );
    }

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Failed to handle call status', { error });
    res.status(500).send('Error');
  }
});

/**
 * POST /api/v1/twilio/sms/incoming
 * Handles incoming SMS messages
 */
router.post('/sms/incoming', async (req: Request, res: Response) => {
  try {
    const { From, To, Body, MessageSid } = req.body;
    
    logger.info('Incoming SMS', { from: From, messageSid: MessageSid, body: Body?.substring(0, 50) });

    // Check for opt-out keywords
    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
    if (optOutKeywords.some(keyword => Body?.toUpperCase().includes(keyword))) {
      await recordOptOut(MessageSid, From, 'sms');
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed. You will no longer receive messages from us.</Message>
</Response>`;
      
      res.type('text/xml');
      return res.send(twiml);
    }

    // Store incoming message
    await dbService.query(
      `INSERT INTO contact_attempts (id, channel, status, response, metadata, timestamp)
       VALUES (gen_random_uuid(), 'sms', 'replied', $1, $2, NOW())`,
      [Body, JSON.stringify({ messageSid: MessageSid, from: From, to: To })]
    );

    // Default response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your response. A member of our team will review your message and get back to you soon.</Message>
</Response>`;

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    logger.error('Failed to handle incoming SMS', { error });
    res.status(500).send('Error');
  }
});

/**
 * POST /api/v1/twilio/sms/status
 * Handles SMS delivery status callbacks
 */
router.post('/sms/status', async (req: Request, res: Response) => {
  try {
    const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body;
    
    logger.info('SMS status update', { 
      messageSid: MessageSid, 
      status: MessageStatus,
      errorCode: ErrorCode 
    });

    // Store status in Redis
    await redisService.set(`sms:${MessageSid}`, JSON.stringify({
      status: MessageStatus,
      to: To,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage,
      updatedAt: new Date().toISOString()
    }), 86400);

    // Update database for final statuses
    if (['delivered', 'failed', 'undelivered'].includes(MessageStatus)) {
      const status = MessageStatus === 'delivered' ? 'delivered' : 'failed';
      await dbService.query(
        `UPDATE contact_attempts 
         SET status = $1, metadata = metadata || $2
         WHERE metadata->>'messageSid' = $3`,
        [
          status,
          JSON.stringify({ deliveryStatus: MessageStatus, errorCode: ErrorCode }),
          MessageSid
        ]
      );
    }

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Failed to handle SMS status', { error });
    res.status(500).send('Error');
  }
});

/**
 * Helper: Record opt-out
 */
async function recordOptOut(sid: string, identifier: string, channel: string): Promise<void> {
  try {
    await dbService.query(
      `INSERT INTO opt_outs (id, identifier, channel, opt_out_type, source, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'all', $3, NOW())
       ON CONFLICT (identifier, channel) DO UPDATE SET updated_at = NOW()`,
      [identifier, channel, `twilio:${sid}`]
    );
    logger.info('Opt-out recorded', { identifier, channel, sid });
  } catch (error) {
    logger.error('Failed to record opt-out', { error, identifier, channel });
  }
}

/**
 * Helper: Record call outcome
 */
async function recordCallOutcome(
  callSid: string, 
  sessionId: string, 
  outcome: string, 
  actions: Record<string, boolean>
): Promise<void> {
  try {
    await redisService.set(`call-outcome:${callSid}`, JSON.stringify({
      sessionId,
      outcome,
      actions,
      recordedAt: new Date().toISOString()
    }), 86400);
    
    logger.info('Call outcome recorded', { callSid, outcome, actions });
  } catch (error) {
    logger.error('Failed to record call outcome', { error, callSid });
  }
}

export default router;
