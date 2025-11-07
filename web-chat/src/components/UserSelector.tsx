import { useState } from 'react';

interface UserSelectorProps {
  onUserSelect: (name: string, id: string) => void;
}

export function UserSelector({ onUserSelect }: UserSelectorProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const userId = crypto.randomUUID();
      onUserSelect(name.trim(), userId);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Bamboozled</h1>
        <p className="mb-6 text-gray-600">Enter your name to start playing</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />

          <button
            type="submit"
            disabled={!name.trim()}
            className="mt-4 w-full rounded-md bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Start Playing
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Type your guess or use commands like /puzzle, /stats, /leaderboard
        </p>
      </div>
    </div>
  );
}
