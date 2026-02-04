import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Task, Message, Channel } from './types';
import { sortTasks } from './utils';

// ============================================
// Auth Store
// ============================================
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    sessionExpiry: string | null;

    // Actions
    setUser: (user: User, expiresAt: string) => void;
    clearUser: () => void;
    checkSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            sessionExpiry: null,

            setUser: (user, expiresAt) => {
                set({
                    user,
                    isAuthenticated: true,
                    sessionExpiry: expiresAt,
                });
            },

            clearUser: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                    sessionExpiry: null,
                });
            },

            checkSession: async () => {
                const { sessionExpiry } = get();

                // Check local expiry first
                if (sessionExpiry && new Date(sessionExpiry) < new Date()) {
                    get().clearUser();
                    return false;
                }

                // Verify with server
                try {
                    const res = await fetch('/api/auth/session');
                    if (!res.ok) {
                        get().clearUser();
                        return false;
                    }
                    return true;
                } catch {
                    return false;
                }
            },
        }),
        {
            name: 'cp-comms-auth',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                sessionExpiry: state.sessionExpiry,
            }),
        }
    )
);

// ============================================
// Task Store
// ============================================
interface TaskState {
    tasks: Task[];
    loading: boolean;
    error: string | null;

    // Actions
    setTasks: (tasks: Task[]) => void;
    addTask: (task: Task) => void;
    updateTask: (task: Task) => void;
    removeTask: (taskId: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    loading: false,
    error: null,

    setTasks: (tasks) => {
        set({ tasks: sortTasks(tasks), loading: false });
    },

    addTask: (task) => {
        const { tasks } = get();
        set({ tasks: sortTasks([...tasks, task]) });
    },

    updateTask: (task) => {
        const { tasks } = get();
        const updated = tasks.map(t => t.id === task.id ? task : t);
        set({ tasks: sortTasks(updated) });
    },

    removeTask: (taskId) => {
        const { tasks } = get();
        set({ tasks: tasks.filter(t => t.id !== taskId) });
    },

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
}));

// ============================================
// Chat Store
// ============================================
interface ChatState {
    messages: Record<Channel, Message[]>;
    typingUsers: Record<Channel, string[]>;
    activeChannel: Channel | null;

    // Actions
    setMessages: (channel: Channel, messages: Message[]) => void;
    addMessage: (message: Message) => void;
    removeMessage: (messageId: string, channel: Channel) => void;
    setTypingUsers: (channel: Channel, userIds: string[]) => void;
    setActiveChannel: (channel: Channel | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: {
        global_chat: [],
        admin_ops: [],
    },
    typingUsers: {
        global_chat: [],
        admin_ops: [],
    },
    activeChannel: null,

    setMessages: (channel, messages) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [channel]: messages,
            },
        }));
    },

    addMessage: (message) => {
        const { messages } = get();
        const channelMessages = messages[message.channel] || [];
        set({
            messages: {
                ...messages,
                [message.channel]: [...channelMessages, message],
            },
        });
    },

    removeMessage: (messageId, channel) => {
        const { messages } = get();
        set({
            messages: {
                ...messages,
                [channel]: messages[channel].filter(m => m.id !== messageId),
            },
        });
    },

    setTypingUsers: (channel, userIds) => {
        set((state) => ({
            typingUsers: {
                ...state.typingUsers,
                [channel]: userIds,
            },
        }));
    },

    setActiveChannel: (channel) => set({ activeChannel: channel }),
}));

// ============================================
// UI Store (toasts, modals, etc.)
// ============================================
interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

interface UIState {
    toasts: Toast[];
    isRejectionModalOpen: boolean;
    selectedTaskForRejection: Task | null;

    // Actions
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    openRejectionModal: (task: Task) => void;
    closeRejectionModal: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
    toasts: [],
    isRejectionModalOpen: false,
    selectedTaskForRejection: null,

    addToast: (toast) => {
        const id = crypto.randomUUID();
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }],
        }));

        // Auto-remove after 4 seconds
        setTimeout(() => {
            get().removeToast(id);
        }, 4000);
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter(t => t.id !== id),
        }));
    },

    openRejectionModal: (task) => {
        set({ isRejectionModalOpen: true, selectedTaskForRejection: task });
    },

    closeRejectionModal: () => {
        set({ isRejectionModalOpen: false, selectedTaskForRejection: null });
    },
}));
