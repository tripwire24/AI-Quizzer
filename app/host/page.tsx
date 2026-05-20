'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore, Question } from '@/store/useQuizStore';
import { YOUNGSHAND_WORKSHOP_PACKS } from '@/lib/workshopActivities';
import { ADVANCED_AI_QUESTIONS } from '@/lib/advancedAiQuestions';
import { Plus, Play, Trash2 } from 'lucide-react';

export default function HostDashboard() {
  const router = useRouter();
  const { quizzes, deleteQuiz } = useQuizStore();
  const [isCreating, setIsCreating] = useState(false);
  const savedQuizzes = Array.isArray(quizzes) ? quizzes.filter((quiz) => Array.isArray(quiz.questions)) : [];

  const handleCreateGame = (questions: Question[]) => {
    setIsCreating(true);
    const socket = getSocket();
    
    socket.emit('create_game', questions);
    
    socket.once('game_created', (pin: string) => {
      router.push(`/host/lobby/${pin}`);
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
          <button 
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-900 font-medium transition-colors"
          >
            Back to Home
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">YoungShand Workshop Packs</h2>
            <button
              onClick={() => router.push('/create')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create New
            </button>
          </div>
          
          <div className="grid gap-6">
            {YOUNGSHAND_WORKSHOP_PACKS.map((pack) => (
              <div key={pack.id} className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:border-indigo-300 transition-colors group">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{pack.title}</h3>
                  <p className="text-gray-600 mb-2 max-w-2xl">{pack.description}</p>
                  <p className="text-sm text-indigo-600 font-semibold">
                    {pack.questions.length} multiple-choice questions
                  </p>
                </div>
                <button
                  onClick={() => handleCreateGame(pack.questions)}
                  disabled={isCreating}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70"
                >
                  <Play className="w-5 h-5" />
                  {isCreating ? 'Creating...' : 'Host'}
                </button>
              </div>
            ))}

            {/* Default Quiz */}
            <div className="border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:border-indigo-300 transition-colors group">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced AI Working Knowledge</h3>
                <p className="text-gray-500">{ADVANCED_AI_QUESTIONS.length} advanced multiple-choice questions</p>
              </div>
              <button
                onClick={() => handleCreateGame(ADVANCED_AI_QUESTIONS)}
                disabled={isCreating}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70"
              >
                <Play className="w-5 h-5" />
                {isCreating ? 'Creating...' : 'Host'}
              </button>
            </div>

            {/* Custom Quizzes */}
            {savedQuizzes.map((quiz) => (
              <div key={quiz.id} className="border border-gray-200 rounded-xl p-6 flex justify-between items-center hover:border-indigo-300 transition-colors group">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h3>
                  <p className="text-gray-500 mb-1">{quiz.description}</p>
                  <p className="text-sm text-gray-400">{quiz.questions.length} Questions</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => deleteQuiz(quiz.id)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleCreateGame(quiz.questions)}
                    disabled={isCreating}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70"
                  >
                    <Play className="w-5 h-5" />
                    Host
                  </button>
                </div>
              </div>
            ))}
            
            {savedQuizzes.length === 0 && (
              <div 
                onClick={() => router.push('/create')}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer font-medium"
              >
                + Create your first custom quiz
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
