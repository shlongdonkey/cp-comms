// Task states and priorities
export type TaskState = 'requested' | 'in_progress' | 'paused' | 'completed' | 'rejected';
export type Urgency = 'now' | '15min' | '1hour' | 'today';
export type UserRole = 'office' | 'factory_office' | 'store_office' | 'factory' | 'driver_crown' | 'driver_electric';
export type Channel = 'global_chat' | 'admin_ops';

export interface User {
    id: string;
    role: UserRole;
    display_name: string;
    created_at: string;
}

export interface Session {
    id: string;
    user_id: string;
    token: string;
    expires_at: string;
    created_at: string;
}

export interface Task {
    id: string;
    created_by: string;
    assigned_to: string | null;
    state: TaskState;
    urgency: Urgency;
    created_at: string;
    deadline: string;
    state_changed_at: string;
    signature: string;
    description: string;
    rejection_reason: string | null;
    rejection_expires: string | null;
}

export interface TaskHistory {
    id: string;
    original_task_id: string;
    task_snapshot: Task;
    completed_at: string;
    delete_after: string;
}

export interface Message {
    id: string;
    sender_id: string;
    sender?: User;
    channel: Channel;
    content: string | null;
    media_urls: string[];
    voice_url: string | null;
    reply_to: string | null;
    read_receipts: Record<string, string>;
    created_at: string;
    delete_after: string;
}

export interface CreateTaskInput {
    signature: string;
    description: string;
    urgency: Urgency;
}

export interface CreateMessageInput {
    channel: Channel;
    content?: string;
    media_urls?: string[];
    voice_url?: string;
    reply_to?: string;
}

// Socket events
export interface ServerToClientEvents {
    'task:created': (task: Task) => void;
    'task:updated': (task: Task) => void;
    'task:deleted': (taskId: string) => void;
    'message:new': (message: Message) => void;
    'message:deleted': (messageId: string) => void;
    'user:typing': (data: { userId: string; channel: Channel }) => void;
    'user:read': (data: { userId: string; messageId: string }) => void;
}

export interface ClientToServerEvents {
    'task:subscribe': () => void;
    'chat:join': (channel: Channel) => void;
    'chat:leave': (channel: Channel) => void;
    'chat:typing': (channel: Channel) => void;
    'chat:read': (messageId: string) => void;
}
