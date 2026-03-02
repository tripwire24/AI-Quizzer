import Link from 'next/link';
import { JoinGameForm } from '@/components/JoinGameForm';
import { UserCircle } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-indigo-950 to-gray-900 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <Link href="/profile" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-sm transition-colors ring-1 ring-white/20">
          <UserCircle className="w-5 h-5" />
          <span className="font-medium">Profile</span>
        </Link>
      </div>

      {/* Floating decoration */}
      <div className="text-6xl mb-6 animate-bounce">🧠</div>

      <div className="w-full max-w-md bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center ring-1 ring-white/10">
        <h1 className="text-4xl font-black text-white mb-1">AI Quizzer</h1>
        <p className="text-indigo-300 mb-8 text-sm">Join a game or host your own!</p>
        
        <JoinGameForm />
        
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-sm text-gray-500 mb-4">Want to host a game?</p>
          <Link 
            href="/host"
            className="inline-block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg"
          >
            🎮 Host a Game
          </Link>
        </div>
      </div>
    </main>
  );
}
