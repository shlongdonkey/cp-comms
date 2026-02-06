# Master PRD: CP Comms Logistics & Messaging Suite

## 1. Brand & Visual Identity
**Company Name:** CP | **App Name:** CP Comms

**Palette:**
- **Primary Blue:** `#2D62A9` (Headers, branding, primary actions)
- **Accent Green:** `#B3E26D` (Completed states, success toasts, driver pings)
- **Neutral Grey:** `#D1D5DB` (Backgrounds, requested states)

**UI Style:** Modern, clean, and card-based. High contrast for industrial visibility.

## 2. Access & Security Logic
### 2.1 Authentication
- **PIN Protection:** Office, Factory Office, and Store Office require a 4-digit PIN.
- **Session Duration:** Logins last for 9 hours. After this, the PIN must be re-entered.
- **PIN Reset:** Users can reset the PIN by providing the previous code.
- **Direct Access:** Factory and Drivers (Crown/Electric) have direct access via dedicated terminals.

### 2.2 Navigation & Routing
- **Persistent Sessions:** Clicking the Company Logo returns the user to their specific dashboard (Office, Store Office, etc.) without a re-login if the session is active.
- **URL Protection:** Strict route guards. Users cannot manually change the URL (e.g., from /factory to /store-office) to bypass security.

## 3. Task Management Mechanics
### 3.1 The "Swipe-to-Action" Friction Layer
- **Action:** Tap/Click and Swipe Left on a request card to reveal action buttons. Buttons are hidden by default to prevent accidental clicks.

### 3.2 State-Based Logic & Priorities
The queue is sorted by State First, then Deadline.
1. **In Progress (Green):** Buttons: Pause | Complete. (Always at the top)
2. **Paused (Yellow):** Button: Resume. (Second priority)
3. **Requested (Grey):** Button: Start. (Third priority)

### 3.3 Deadline Calculation
`[Time Created] + [Urgency Duration] = Deadline.`
- **Urgency Options:** Now (0m), 15min, 1hour, Today.
- *Example:* A 6:15 AM request with 15min urgency (6:30 AM) stays above a 7:00 AM "Now" request.

### 3.4 Feedback & Notifications
- **Stale Task Pulse:** If a task is In Progress for >2 hours, the card pulses red.
- **Creation Feedback:** Success/Failure toasts for all actions.
- **Loading States:** Buttons disable and show spinners upon click to prevent "button spamming."

## 4. Messaging & Communication (CP Chat)
### 4.1 Channels
- **#Global-Chat:** All profiles. Usernames are color-coded by role (e.g., Office = Blue, Drivers = Green).
- **#Admin-Ops:** Office, Factory Office, and Store Office only.

### 4.2 Interaction Features
- **Media:** Max 3 attachments (Photos/Files) per message. Full-screen Lightbox for photos.
- **Voice:** Push-to-talk voice messages.
- **Social Logic:** Threaded replies (WhatsApp style), @pings (special notifications), Read Receipts, and typing indicators.
- **Retention:** All messages and media auto-purge after 14 days.

## 5. Technical Requirements
### 5.1 Zero-Refresh & Concurrency
- **Live Updates:** Use WebSockets for instant global updates. No user should ever have to refresh.
- **Multi-User Office:** Support 3+ simultaneous users on the Office page with synchronized states.

### 5.2 Input Validation
- **Signature:** Only 2 letters allowed. Auto-formats with a dot (e.g., "JD" becomes "J.D").
- **Rejection:** Store Office must provide a reason (max 150 chars). The rejected request remains visible with an "i" icon for 1 hour before deleting.
- **Resilience:** Offline queueing for drivers to sync actions once Wi-Fi returns.

## 6. History & Archiving
- **Completed Page:** Grouped by month (dropdowns). Filterable by date.
- **Retention:** Completed tasks older than 6 months are automatically deleted.
