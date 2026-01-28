# MOJAVOX UI Audit Report - Buttons with Toast-Only Actions

## Overview
This report identifies buttons and links that currently show toast notifications instead of opening proper UI interfaces. Each entry includes the page, button description, and suggested action.

---

## 1. Dashboard.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Manage Widgets | Opens widget management | ✅ Already functional |
| Edit Layout | Opens layout editor | ✅ Already functional |

**Status:** ✅ OK - No issues found

---

## 2. LiveMonitor.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Volume Control (Volume2 icon) | Toast: "Adjusting call volume..." | Create volume slider popover |
| Microphone (Mic icon) | Toast: "Supervisor mic is muted" | Create mute toggle with visual state |

**Status:** ⚠️ Minor - These are informational toasts for toggle actions, acceptable

---

## 3. Campaigns.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| View All | Toast: "All campaigns displayed" | Navigate to full campaigns list or expand view |

**Status:** ⚠️ Minor - Should navigate or expand, not just toast

---

## 4. Fleet.tsx (AI Fleet)
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Settings (per agent) | Toast: "Opening agent configuration..." | Open agent settings dialog/panel |
| Google TTS button | Toast: "Switching to Google TTS..." | Should toggle and show confirmation |
| Play Voice Sample | Toast: "Playing voice sample..." | Should play audio and show player |
| View All | Toast: "All agents displayed" | Navigate to full agents list |

**Status:** ⚠️ Medium - Settings button should open a dialog

---

## 5. Debtors.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Add Debtor | Toast: "Redirecting to debtor import wizard..." | Navigate to import wizard (needs route) |

**Status:** ⚠️ Medium - Should navigate to actual wizard page

---

## 6. Settings.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Manage (API Keys) | Toast: "Opening API key management..." | Navigate to /api-integration or open dialog |
| Configure/Connect (Services) | Toast: "Opening configuration..." | Open service configuration dialog |
| Change Plan | Toast: "Opening plan selection..." | Open plan selection dialog/page |
| View Invoices | Toast: "Loading invoice history..." | Navigate to invoices page or open dialog |

**Status:** 🔴 High - Multiple buttons need proper interfaces

---

## 7. Reports.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| New Report | Toast: "Opening report builder..." | Open report builder dialog |
| Filter | Toast: "Opening filter options..." | Open filter popover/dialog |
| Date Range | Toast: "Select date range..." | Open date range picker |
| Download | Toast: "Downloading..." | Actually download file |

**Status:** 🔴 High - Report builder and filters need implementation

---

## 8. Notifications.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Settings (gear icon) | Toast: "Opening notification settings..." | Navigate to /email-notifications or open dialog |

**Status:** ⚠️ Medium - Should navigate to notification settings

---

## 9. CallPlayback.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Skip Back | Toast: "Skipping back 10 seconds" | Should actually skip in audio player |
| Skip Forward | Toast: "Skipping forward 10 seconds" | Should actually skip in audio player |

**Status:** ⚠️ Medium - Audio controls should work with actual player

---

## 10. UserManagement.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Add User | Toast: "Opening user creation form..." | Open user creation dialog |
| Edit User (dropdown) | Toast: "Editing user..." | Open user edit dialog |
| Change Role (dropdown) | Toast: "Changing role..." | Open role selection dialog |
| Deactivate (dropdown) | Toast: "Deactivating..." | Open confirmation dialog |

**Status:** 🔴 High - All user management actions need dialogs

---

## 11. Landing.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Watch Demo | Toast: "Opening demo video..." | Open video modal or navigate to demo page |
| Schedule a Demo | Toast: "Opening calendar..." | Open calendar booking modal or external link |

**Status:** ⚠️ Medium - Demo video should open modal

---

## 12. Support.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Start Chat | Toast: "Connecting to support agent..." | Open live chat widget/modal |
| View All Tickets | Toast: "Loading all support tickets..." | Navigate to tickets list page |
| Video Tutorials | Toast: "Opening video library..." | Navigate to tutorials page or open modal |

**Status:** ⚠️ Medium - Live chat and tickets need implementation

---

## 13. Docs.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| API Reference | Toast: "Opening full API documentation..." | Navigate to API docs page or open in new tab |

**Status:** ⚠️ Minor - Should navigate to actual docs

---

## 14. DebtorDetail.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Call Now | Toast: "Initiating call..." | Open call initiation dialog with options |
| Send SMS | Toast: "SMS dialog opened" | Open SMS composition dialog |
| Edit | Toast: "Edit mode enabled" | Enable inline editing or open edit dialog |

**Status:** 🔴 High - All actions need proper dialogs

---

## 15. DebtorSegments.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| View (segment) | Toast: "Viewing segment debtors" | Navigate to filtered debtors list |
| Campaign (segment) | Toast: "Starting campaign for segment" | Open campaign creation with segment pre-selected |

**Status:** ⚠️ Medium - Should navigate to relevant pages

---

## 16. ScriptAnalyzer.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Refresh | Toast: "Analysis refreshed" | Actually refresh analysis data |
| Generate Optimized Script | Toast: "Generating optimized script..." | Open script generation dialog or show results |

**Status:** ⚠️ Medium - Generate should show results

---

## 17. TaskPlanner.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Edit (task) | Toast: "Edit dialog opened" | Open task edit dialog (similar to create) |

**Status:** 🔴 High - Edit dialog needs implementation

---

## 18. EmailTemplates.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Create Template | Toast: "Feature coming soon" | Open template creation dialog |

**Status:** 🔴 High - Template creation needs implementation

---

## 19. ScriptEditor.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Create Script | Toast: "Feature coming soon" | Open script creation dialog |
| Delete Node | Toast: "Feature coming soon" | Open confirmation dialog |
| Add Node | Toast: "Feature coming soon" | Open node type selection dialog |

**Status:** 🔴 High - Script editing features need implementation

---

## 20. BrandingSettings.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Upload Logo | Toast: "Feature coming soon" | Implement file upload dialog |

**Status:** ⚠️ Medium - Logo upload needs implementation

---

## 21. CampaignCalendar.tsx
| Button | Current Behavior | Suggested Action |
|--------|-----------------|------------------|
| Week View | Toast: "Week view coming soon" | Implement week view |

**Status:** ⚠️ Medium - Week view needs implementation

---

## Summary by Priority

### 🔴 HIGH PRIORITY (Need immediate attention)
1. **Settings.tsx** - API Keys, Services, Plan, Invoices buttons
2. **Reports.tsx** - Report builder, filters, date range
3. **UserManagement.tsx** - Add/Edit/Deactivate user dialogs
4. **DebtorDetail.tsx** - Call, SMS, Edit dialogs
5. **TaskPlanner.tsx** - Edit task dialog
6. **EmailTemplates.tsx** - Create template dialog
7. **ScriptEditor.tsx** - Create script, node management

### ⚠️ MEDIUM PRIORITY (Should be addressed)
1. **Fleet.tsx** - Agent settings dialog
2. **Debtors.tsx** - Add debtor wizard navigation
3. **Notifications.tsx** - Settings navigation
4. **CallPlayback.tsx** - Audio player controls
5. **Landing.tsx** - Demo video modal
6. **Support.tsx** - Live chat, tickets list
7. **DebtorSegments.tsx** - View/Campaign navigation
8. **ScriptAnalyzer.tsx** - Generate script results
9. **BrandingSettings.tsx** - Logo upload
10. **CampaignCalendar.tsx** - Week view

### ✅ LOW PRIORITY / OK
1. **Dashboard.tsx** - All functional
2. **LiveMonitor.tsx** - Toggle states are acceptable
3. **Campaigns.tsx** - View All is minor
4. **Docs.tsx** - External link is acceptable

---

## Recommended Implementation Order

1. **UserManagement.tsx** - Critical for admin functionality
2. **Settings.tsx** - Core settings need to work
3. **Reports.tsx** - Business-critical reporting
4. **TaskPlanner.tsx** - Edit task is essential
5. **DebtorDetail.tsx** - Core debtor management
6. **ScriptEditor.tsx** - Script management
7. **EmailTemplates.tsx** - Template management
8. **Fleet.tsx** - Agent configuration
9. **Support.tsx** - Customer support features
10. **Landing.tsx** - Marketing page polish
