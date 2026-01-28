/**
 * MOJAVOX Payment Feedback Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Rate payment experience (1-5 stars)
 * - Leave detailed comments
 * - View past feedback
 * - Quick feedback options
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Check,
  MessageSquare,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Sparkles,
  Clock,
  Shield,
  Zap,
  Heart,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

// Feedback type
interface Feedback {
  id: string;
  rating: number;
  comment: string;
  tags: string[];
  date: string;
  transactionId?: string;
}

// Quick feedback tags
const quickTags = [
  { id: "fast", label: "Fast Process", icon: Zap },
  { id: "easy", label: "Easy to Use", icon: Sparkles },
  { id: "secure", label: "Felt Secure", icon: Shield },
  { id: "helpful", label: "Helpful Support", icon: Heart },
  { id: "slow", label: "Too Slow", icon: Clock },
  { id: "confusing", label: "Confusing", icon: MessageSquare },
];

// Mock past feedback
const mockFeedback: Feedback[] = [
  {
    id: "fb_1",
    rating: 5,
    comment: "Very smooth payment process. The new card validation is great!",
    tags: ["fast", "easy", "secure"],
    date: "2026-01-25",
    transactionId: "TXN-2026-0125-4521",
  },
  {
    id: "fb_2",
    rating: 4,
    comment: "Good experience overall. Would like more payment options.",
    tags: ["easy"],
    date: "2026-01-15",
    transactionId: "TXN-2026-0115-4521",
  },
];

// Star rating component
function StarRating({ 
  value, 
  onChange, 
  readonly = false,
  size = "lg"
}: { 
  value: number; 
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "lg";
}) {
  const [hoverValue, setHoverValue] = useState(0);
  const sizeClass = size === "lg" ? "w-10 h-10" : "w-5 h-5";

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          className={cn(
            "transition-all duration-150",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              sizeClass,
              "transition-colors",
              (hoverValue || value) >= star
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// Rating label
function getRatingLabel(rating: number): string {
  switch (rating) {
    case 1: return "Very Poor";
    case 2: return "Poor";
    case 3: return "Average";
    case 4: return "Good";
    case 5: return "Excellent";
    default: return "Select a rating";
  }
}

export default function PaymentFeedback() {
  const [loading, setLoading] = useState(true);
  const [pastFeedback, setPastFeedback] = useState<Feedback[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // New feedback form
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Load past feedback
  useEffect(() => {
    const loadFeedback = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setPastFeedback(mockFeedback);
      setLoading(false);
    };
    loadFeedback();
  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newFeedback: Feedback = {
      id: `fb_${Date.now()}`,
      rating,
      comment,
      tags: selectedTags,
      date: new Date().toISOString().split("T")[0],
    };

    setPastFeedback(prev => [newFeedback, ...prev]);
    setSubmitting(false);
    setSubmitted(true);

    toast.success("Thank you for your feedback!", {
      description: "Your feedback helps us improve our payment experience.",
    });

    // Reset form after delay
    setTimeout(() => {
      setRating(0);
      setComment("");
      setSelectedTags([]);
      setSubmitted(false);
    }, 3000);
  };

  // Calculate average rating
  const averageRating = pastFeedback.length > 0
    ? pastFeedback.reduce((sum, f) => sum + f.rating, 0) / pastFeedback.length
    : 0;

  // Count positive vs negative feedback
  const positiveFeedback = pastFeedback.filter(f => f.rating >= 4).length;
  const negativeFeedback = pastFeedback.filter(f => f.rating <= 2).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Payment Feedback</h1>
          <p className="text-muted-foreground mt-1">Help us improve your payment experience</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <p className="text-xl font-bold text-foreground">{averageRating.toFixed(1)} / 5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <ThumbsUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Positive Reviews</p>
                  <p className="text-xl font-bold text-foreground">{positiveFeedback}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-blue/20">
                  <TrendingUp className="w-5 h-5 text-neon-blue" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Feedback</p>
                  <p className="text-xl font-bold text-foreground">{pastFeedback.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submit Feedback */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-neon-green" />
                Share Your Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {submitted ? (
                <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-neon-green" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Thank You!</h3>
                  <p className="text-muted-foreground">
                    Your feedback has been submitted successfully.
                  </p>
                </div>
              ) : (
                <>
                  {/* Star Rating */}
                  <div className="text-center">
                    <Label className="text-foreground block mb-3">How was your payment experience?</Label>
                    <StarRating value={rating} onChange={setRating} />
                    <p className={cn(
                      "text-sm mt-2 transition-colors",
                      rating > 0 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {getRatingLabel(rating)}
                    </p>
                  </div>

                  <Separator className="bg-border" />

                  {/* Quick Tags */}
                  <div>
                    <Label className="text-foreground block mb-3">What stood out? (Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {quickTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.id);
                        const Icon = tag.icon;
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                              isSelected
                                ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                                : "bg-background text-muted-foreground border-border hover:border-muted-foreground/50"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <Label className="text-foreground block mb-2">Additional Comments (Optional)</Label>
                    <Textarea
                      placeholder="Tell us more about your experience..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="bg-background border-border min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {comment.length}/500
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    className="w-full bg-neon-green hover:bg-neon-green/90 text-background"
                    onClick={handleSubmitFeedback}
                    disabled={submitting || rating === 0}
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Past Feedback */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-neon-blue" />
                Your Past Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="p-4 rounded-lg bg-background/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-5 bg-muted rounded w-24" />
                          <div className="h-4 bg-muted rounded w-16" />
                        </div>
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="flex gap-2">
                          <div className="h-6 bg-muted rounded w-16" />
                          <div className="h-6 bg-muted rounded w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pastFeedback.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No feedback yet</h3>
                  <p className="text-muted-foreground">
                    Share your first feedback to help us improve.
                  </p>
                </div>
              ) : (
                <StaggerContainer className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {pastFeedback.map((feedback) => (
                    <StaggerItem key={feedback.id}>
                      <div className="p-4 rounded-lg bg-background/50 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <StarRating value={feedback.rating} readonly size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(feedback.date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {feedback.comment && (
                          <p className="text-sm text-foreground mb-3">
                            "{feedback.comment}"
                          </p>
                        )}
                        
                        {feedback.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {feedback.tags.map(tagId => {
                              const tag = quickTags.find(t => t.id === tagId);
                              if (!tag) return null;
                              return (
                                <span
                                  key={tagId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                                >
                                  <tag.icon className="w-3 h-3" />
                                  {tag.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        
                        {feedback.transactionId && (
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            {feedback.transactionId}
                          </p>
                        )}
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feedback Impact */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-neon-green/20">
                <Sparkles className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Your feedback makes a difference</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on user feedback, we've improved our payment process by 40% in the last quarter. 
                  Recent updates include faster card validation, more payment options, and enhanced security features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
