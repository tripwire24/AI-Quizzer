'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizStore, Question, Quiz } from '@/store/useQuizStore';
import { Plus, Trash2, Save, ArrowLeft, Settings } from 'lucide-react';

const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];

export default function CreateQuizPage() {
  const router = useRouter();
  const { addQuiz } = useQuizStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q1',
      text: '',
      timeLimit: 20,
      options: [
        { id: 'o1', text: '', color: COLORS[0], isCorrect: true },
        { id: 'o2', text: '', color: COLORS[1], isCorrect: false },
        { id: 'o3', text: '', color: COLORS[2], isCorrect: false },
        { id: 'o4', text: '', color: COLORS[3], isCorrect: false },
      ]
    }
  ]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q${Date.now()}`,
        text: '',
        timeLimit: 20,
        options: [
          { id: `o1_${Date.now()}`, text: '', color: COLORS[0], isCorrect: true },
          { id: `o2_${Date.now()}`, text: '', color: COLORS[1], isCorrect: false },
          { id: `o3_${Date.now()}`, text: '', color: COLORS[2], isCorrect: false },
          { id: `o4_${Date.now()}`, text: '', color: COLORS[3], isCorrect: false },
        ]
      }
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestionText = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const updateQuestionTime = (id: string, timeLimit: number) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, timeLimit } : q));
  };

  const updateOptionText = (qId: string, oId: string, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.map(o => o.id === oId ? { ...o, text } : o)
        };
      }
      return q;
    }));
  };

  const setCorrectOption = (qId: string, oId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.map(o => ({ ...o, isCorrect: o.id === oId }))
        };
      }
      return q;
    }));
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a quiz title');
      return;
    }
    
    const newQuiz: Quiz = {
      id: `quiz_${Date.now()}`,
      title,
      description,
      questions,
      createdAt: new Date().toISOString()
    };
    
    addQuiz(newQuiz);
    router.push('/host');
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => router.push('/host')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Save className="w-5 h-5" />
            Save Quiz
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Quiz Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Advanced AI Concepts"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this quiz about?"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleRemoveQuestion(q.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove Question"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Question {index + 1}</h3>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-500">Time Limit:</label>
                  <select
                    value={q.timeLimit}
                    onChange={(e) => updateQuestionTime(q.id, Number(e.target.value))}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 font-medium text-gray-700 outline-none focus:border-indigo-500"
                  >
                    <option value={10}>10s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                value={q.text}
                onChange={(e) => updateQuestionText(q.id, e.target.value)}
                placeholder="Type your question here..."
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-xl font-bold text-center mb-8"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt, optIndex) => (
                  <div key={opt.id} className={`relative rounded-xl overflow-hidden border-2 transition-all ${opt.isCorrect ? 'border-indigo-500 shadow-md' : 'border-transparent'}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-12 ${opt.color} flex items-center justify-center`}>
                      <input
                        type="radio"
                        name={`correct_${q.id}`}
                        checked={opt.isCorrect}
                        onChange={() => setCorrectOption(q.id, opt.id)}
                        className="w-5 h-5 cursor-pointer accent-white"
                        title="Mark as correct answer"
                      />
                    </div>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)}
                      placeholder={`Answer ${optIndex + 1}`}
                      className="w-full pl-16 pr-4 py-4 bg-gray-50 outline-none font-semibold text-gray-800"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddQuestion}
          className="w-full mt-8 py-6 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-6 h-6" />
          Add Question
        </button>
      </div>
    </main>
  );
}
