import Link from 'next/link';
import { JoinGameForm } from '@/components/JoinGameForm';
import { UserCircle } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <Link href="/profile" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full backdrop-blur-sm transition-colors">
          <UserCircle className="w-5 h-5" />
          <span className="font-medium">Profile</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-900 mb-2">AI Quizzer</h1>
        <p className="text-gray-500 mb-8">Join a game or host your own!</p>
        
        <JoinGameForm />
        
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-4">Want to host a game?</p>
          <Link 
            href="/host"
            className="inline-block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors"
          >
            Host a Game
          </Link>
        </div>
      </div>
    </main>
  );
}
