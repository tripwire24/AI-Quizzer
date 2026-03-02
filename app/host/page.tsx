'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore, Question } from '@/store/useQuizStore';
import { Plus, Play, Trash2 } from 'lucide-react';

const DEFAULT_QUESTIONS: Question[] = [
  { id: 'q1', text: 'What does "AI" stand for?', options: [{ id: 'o1', text: 'Artificial Iguanas', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Automated Ice-cream', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Augmented Intelligence', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'Artificial Intelligence', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q2', text: 'What\'s a "prompt"?', options: [{ id: 'o1', text: 'A polite cough to get attention', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'A tiny robot that lives in your keyboard', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'A training dataset for AI', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'The instruction you give the AI', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q3', text: '"Machine learning" is best described as:', options: [{ id: 'o1', text: 'A computer learning to moonwalk', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'A robot doing homework', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'A computer learning patterns from data', color: 'bg-yellow-500', isCorrect: true }, { id: 'o4', text: 'A computer storing data in a database', color: 'bg-green-500', isCorrect: false }], timeLimit: 30 },
  { id: 'q4', text: 'What does it mean to "train" an AI model?', options: [{ id: 'o1', text: 'Taking it to the gym for leg day', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Teaching it to make coffee', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Adjusting it using examples so it improves', color: 'bg-yellow-500', isCorrect: true }, { id: 'o4', text: 'Encrypting the model so it\'s secure', color: 'bg-green-500', isCorrect: false }], timeLimit: 30 },
  { id: 'q5', text: 'Which is an example of "generative AI"?', options: [{ id: 'o1', text: 'A microwave that guesses your feelings', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'A printer that jams creatively', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'A system that detects spam emails', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'A system that creates new text/images/audio', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q6', text: 'What\'s a "hallucination" in AI?', options: [{ id: 'o1', text: 'The AI seeing ghosts in the Wi-Fi', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'When the AI starts flirting with HR', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'When the AI refuses to answer', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'When the AI outputs confident but wrong info', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q7', text: 'Which term relates most to AI understanding human language?', options: [{ id: 'o1', text: 'Really Loud Typing (RLT)', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Digital Telepathy', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Computer Vision', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'Natural Language Processing (NLP)', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q8', text: 'What is "computer vision"?', options: [{ id: 'o1', text: 'A laptop with contact lenses', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'When your monitor "sees" you back', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'AI interpreting images/video', color: 'bg-yellow-500', isCorrect: true }, { id: 'o4', text: 'AI generating text responses', color: 'bg-green-500', isCorrect: false }], timeLimit: 30 },
  { id: 'q9', text: 'Which is closer to what a "model" is in AI?', options: [{ id: 'o1', text: 'A supermodel but for spreadsheets', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'A plastic toy kit', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'A list of rules written by humans', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'A trained system that makes predictions/outputs', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q10', text: 'What does "bias" in AI usually mean?', options: [{ id: 'o1', text: 'The AI has a favourite colour and won\'t shut up', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'The model only works on Tuesdays', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Outputs can unfairly favour certain groups/outcomes', color: 'bg-yellow-500', isCorrect: true }, { id: 'o4', text: 'The AI is inaccurate due to slow internet', color: 'bg-green-500', isCorrect: false }], timeLimit: 30 },
  { id: 'q11', text: 'Which is the best "safety move" when AI gives you a fact?', options: [{ id: 'o1', text: 'Trust it more if it sounds confident', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Ask it to pinky swear', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Copy-paste it into a slide immediately', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'Verify with a reliable source', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q12', text: 'What\'s the difference between "data" and "information" (best choice)?', options: [{ id: 'o1', text: 'Data is pasta, information is sauce', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Data is what your boss says, information is what you hear', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Data is always numbers, information is always words', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'Data is raw facts; information is interpreted/meaningful', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q13', text: 'What does "automation" mean in a workplace context?', options: [{ id: 'o1', text: 'Replacing meetings with interpretive dance', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Making a spreadsheet sentient', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Hiring more people (surprise!)', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'Using tech to run tasks automatically', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q14', text: 'Which one is most likely a "deepfake"?', options: [{ id: 'o1', text: 'A fish that swims too deep', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'A fake moustache from a costume shop', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'A blurry photo from 2007', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'AI-made media that imitates a real person convincingly', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q15', text: 'What\'s the key difference between "search" and "generative AI"?', options: [{ id: 'o1', text: 'Search makes coffee, generative AI makes tea', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Search is older than dirt', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Search always lies, generative AI never lies', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'Search retrieves sources; generative AI produces new output', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q16', text: 'What does "fine-tuning" usually mean?', options: [{ id: 'o1', text: 'Turning the volume knob very carefully', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Adjusting the office aircon again', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'Training a model from scratch on huge data', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'Further training a model on specific data for a task', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q17', text: 'Which is most accurate about AI "knowing" things?', options: [{ id: 'o1', text: 'It knows everything, that\'s why it\'s scary', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'It knows what you did last summer', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'It predicts likely outputs based on patterns', color: 'bg-yellow-500', isCorrect: true }, { id: 'o4', text: 'It stores the entire internet word-for-word', color: 'bg-green-500', isCorrect: false }], timeLimit: 30 },
  { id: 'q18', text: 'Which is an example of a training dataset?', options: [{ id: 'o1', text: 'A playlist called "Bangers Only"', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'Your lunch order history (unless you\'re weirdly organised)', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'A large set of labeled examples used to teach a model', color: 'bg-yellow-500', isCorrect: true }, { id: 'o4', text: 'A list of final answers the AI must always say', color: 'bg-green-500', isCorrect: false }], timeLimit: 30 },
  { id: 'q19', text: 'What\'s a "token" in many AI text models?', options: [{ id: 'o1', text: 'A gold coin from a pirate movie', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'A corporate buzzword you can redeem for nothing', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'A full sentence the AI reads at once', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'A chunk of text (often part of a word)', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
  { id: 'q20', text: '"Overfitting" usually means:', options: [{ id: 'o1', text: 'The AI model gained muscle too fast', color: 'bg-red-500', isCorrect: false }, { id: 'o2', text: 'The AI is emotionally attached to Excel', color: 'bg-blue-500', isCorrect: false }, { id: 'o3', text: 'The model performs well on new data', color: 'bg-yellow-500', isCorrect: false }, { id: 'o4', text: 'The model learns training data too well and fails on new data', color: 'bg-green-500', isCorrect: true }], timeLimit: 30 },
];

export default function HostDashboard() {
  const router = useRouter();
  const { quizzes, deleteQuiz } = useQuizStore();
  const [isCreating, setIsCreating] = useState(false);

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
            <h2 className="text-2xl font-semibold text-gray-900">Your Quizzes</h2>
            <button
              onClick={() => router.push('/create')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create New
            </button>
          </div>
          
          <div className="grid gap-6">
            {/* Default Quiz */}
            <div className="border border-gray-200 rounded-xl p-6 flex justify-between items-center hover:border-indigo-300 transition-colors group">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">AI Concepts Basics</h3>
                <p className="text-gray-500">{DEFAULT_QUESTIONS.length} Questions • 20s per question</p>
              </div>
              <button
                onClick={() => handleCreateGame(DEFAULT_QUESTIONS)}
                disabled={isCreating}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70"
              >
                <Play className="w-5 h-5" />
                {isCreating ? 'Creating...' : 'Host'}
              </button>
            </div>

            {/* Custom Quizzes */}
            {quizzes.map((quiz) => (
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
            
            {quizzes.length === 0 && (
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
