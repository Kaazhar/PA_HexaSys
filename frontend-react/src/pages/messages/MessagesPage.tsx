import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, MessageCircle, Home, Tag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { messageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import type { Conversation } from '../../types';

const sidebarItems = [
  { label: 'Accueil', path: '/', icon: <Home className="w-4 h-4" /> },
  { label: 'Annonces', path: '/annonces', icon: <Tag className="w-4 h-4" /> },
  { label: 'Messages', path: '/messages', icon: <MessageCircle className="w-4 h-4" /> },
];

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageService.getConversations(),
    refetchInterval: 5000,
  });

  const conversations: Conversation[] = convsData?.data ?? [];

  // Auto-select conversation passed from "Contacter le vendeur"
  useEffect(() => {
    const targetId = location.state?.conversationId;
    if (targetId && conversations.length > 0 && !selectedConv) {
      const found = conversations.find(c => c.id === targetId);
      if (found) setSelectedConv(found);
    }
  }, [conversations, location.state]);

  const { data: msgsData } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: () => messageService.getMessages(selectedConv!.id),
    enabled: !!selectedConv,
    refetchInterval: 3000,
  });

  const messages = msgsData?.data ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => messageService.send(selectedConv!.id, content),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const getOtherUser = (conv: Conversation) => {
    if (!user) return null;
    return conv.participant_one_id === user.id ? conv.participant_two : conv.participant_one;
  };

  const handleSend = () => {
    if (!messageText.trim() || !selectedConv) return;
    sendMutation.mutate(messageText.trim());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Messages">
      <div className="h-[calc(100vh-180px)] flex gap-4">
        {/* Conversations list */}
        <div className="w-72 flex-shrink-0 flex flex-col card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Messages</h2>
          </div>

          {convsLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucune conversation</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {conversations.map((conv: Conversation) => {
                const other = getOtherUser(conv);
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={clsx(
                      'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-primary-50 border-l-2 border-l-primary-500'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary-600">
                          {other?.firstname?.charAt(0)?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {other ? `${other.firstname} ${other.lastname}` : 'Utilisateur'}
                        </p>
                        {conv.last_message && (
                          <p className="text-xs text-gray-400 truncate">{conv.last_message}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col card p-0 overflow-hidden">
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageCircle className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Sélectionnez une conversation</p>
              <p className="text-sm text-gray-400 mt-1">
                Cliquez sur une annonce pour contacter un vendeur
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                {(() => {
                  const other = getOtherUser(selectedConv);
                  return (
                    <>
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {other?.firstname?.charAt(0)?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {other ? `${other.firstname} ${other.lastname}` : 'Utilisateur'}
                        </p>
                        {selectedConv.listing && (
                          <p className="text-xs text-gray-400">Re: {selectedConv.listing.title}</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg: any) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                      <div className={clsx(
                        'max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm',
                        isMe
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      )}>
                        <p>{msg.content}</p>
                        <p className={clsx('text-xs mt-1', isMe ? 'text-white/60' : 'text-gray-400')}>
                          {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Écrivez un message..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={handleKey}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                  className="btn-primary px-4 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
