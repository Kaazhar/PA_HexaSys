import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Tag, PlusCircle, Package, Star, Calendar, BookOpen, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import type { Conversation, Message } from '../../types';

const sidebarItemsByRole: Record<string, { label: string; path: string; icon: React.ReactNode }[]> = {
  particulier: [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Mes annonces', path: '/annonces/mes-annonces', icon: <Tag className="w-4 h-4" /> },
    { label: 'Créer une annonce', path: '/annonces/creer', icon: <PlusCircle className="w-4 h-4" /> },
    { label: 'Demande conteneur', path: '/conteneurs/demande', icon: <Package className="w-4 h-4" /> },
    { label: 'Mon score', path: '/score', icon: <Star className="w-4 h-4" /> },
    { label: 'Planning', path: '/planning', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Formations', path: '/annonces', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Messages', path: '/messages', icon: <MessageSquare className="w-4 h-4" /> },
  ],
  professionnel: [
    { label: 'Dashboard', path: '/pro', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Mes annonces', path: '/annonces/mes-annonces', icon: <Tag className="w-4 h-4" /> },
    { label: 'Créer une annonce', path: '/annonces/creer', icon: <PlusCircle className="w-4 h-4" /> },
    { label: 'Mon score', path: '/score', icon: <Star className="w-4 h-4" /> },
    { label: 'Messages', path: '/messages', icon: <MessageSquare className="w-4 h-4" /> },
  ],
  salarie: [
    { label: 'Dashboard', path: '/salarie', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Messages', path: '/messages', icon: <MessageSquare className="w-4 h-4" /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Messages', path: '/messages', icon: <MessageSquare className="w-4 h-4" /> },
  ],
};

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sidebarItems = sidebarItemsByRole[user?.role || 'particulier'] || sidebarItemsByRole.particulier;

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageService.getConversations(),
    refetchInterval: 5000,
  });
  const conversations: Conversation[] = convsData?.data || [];

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConvId],
    queryFn: () => messageService.getMessages(selectedConvId!),
    enabled: selectedConvId !== null,
    refetchInterval: 3000,
  });
  const messages: Message[] = messagesData?.data || [];

  const sendMutation = useMutation({
    mutationFn: (content: string) => messageService.sendMessage(selectedConvId!, content),
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || sendMutation.isPending) return;
    sendMutation.mutate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    if (!user) return null;
    return conv.participant_one_id === user.id ? conv.participant_two : conv.participant_one;
  };

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Messages">
      <div className="h-[calc(100vh-9rem)] flex gap-0 rounded-xl overflow-hidden border border-gray-200 bg-white">

        {/* Liste conversations */}
        <div className={clsx(
          'w-full md:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col',
          selectedConvId !== null ? 'hidden md:flex' : 'flex'
        )}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Conversations</h2>
          </div>

          {convsLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 p-6 text-center">
              <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Aucune conversation pour le moment.</p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {conversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isSelected = conv.id === selectedConvId;
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedConvId(conv.id)}
                      className={clsx(
                        'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors',
                        isSelected && 'bg-primary-50 border-r-2 border-primary-500'
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden relative">
                        <span className="absolute">{other?.firstname?.charAt(0)}{other?.lastname?.charAt(0)}</span>
                        {other?.avatar_url && (
                          <img src={other.avatar_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {other?.firstname} {other?.lastname}
                        </p>
                        {conv.last_message && (
                          <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {format(new Date(conv.last_message_at), 'dd/MM', { locale: fr })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Zone messages */}
        <div className={clsx(
          'flex-1 flex flex-col',
          selectedConvId === null ? 'hidden md:flex' : 'flex'
        )}>
          {selectedConvId === null ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Sélectionnez une conversation</p>
            </div>
          ) : (
            <>
              {/* Header conversation */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden p-1 text-gray-500 hover:text-gray-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {selectedConv && (() => {
                  const other = getOtherParticipant(selectedConv);
                  return (
                    <>
                      <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden relative">
                        <span className="absolute">{other?.firstname?.charAt(0)}{other?.lastname?.charAt(0)}</span>
                        {other?.avatar_url && (
                          <img src={other.avatar_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{other?.firstname} {other?.lastname}</p>
                        {selectedConv.listing && (
                          <p className="text-xs text-gray-500 truncate">Re : {selectedConv.listing.title}</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex justify-center py-10"><LoadingSpinner /></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-10">Aucun message. Commencez la conversation !</p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={clsx('flex', isMine ? 'justify-end' : 'justify-start')}>
                        {!isMine && (
                          <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end overflow-hidden relative">
                            <span className="absolute">{msg.sender?.firstname?.charAt(0)}</span>
                            {msg.sender?.avatar_url && (
                              <img src={msg.sender.avatar_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            )}
                          </div>
                        )}
                        <div className={clsx(
                          'max-w-[70%] px-4 py-2 rounded-2xl text-sm',
                          isMine
                            ? 'bg-primary-500 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        )}>
                          <p>{msg.content}</p>
                          <p className={clsx('text-xs mt-1', isMine ? 'text-white/60' : 'text-gray-400')}>
                            {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Écrire un message... (Entrée pour envoyer)"
                    rows={1}
                    className="flex-1 input resize-none min-h-[42px] max-h-32"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || sendMutation.isPending}
                    className="btn-primary p-2.5 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
