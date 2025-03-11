
import React, { useState } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import NoteCard from "@/components/NoteCard";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Index = () => {
  const [notes, setNotes] = useState<Array<{
    id: string;
    title: string;
    content: string;
    timestamp: string;
    category: string;
    tags: string[];
  }>>([]);

  const handleTranscriptionComplete = (text: string, category: string, tags: string[]) => {
    const newNote = {
      id: Date.now().toString(),
      title: `Note ${notes.length + 1}`,
      content: text,
      timestamp: new Date().toLocaleString(),
      category: category,
      tags: tags,
    };
    setNotes([newNote, ...notes]);
  };

  // Group notes by category
  const notesByCategory = notes.reduce((acc, note) => {
    if (!acc[note.category]) {
      acc[note.category] = [];
    }
    acc[note.category].push(note);
    return acc;
  }, {} as Record<string, typeof notes>);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <div className="flex flex-col items-center space-y-8">
          <div className="w-full max-w-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-bold tracking-tight">My Notes</h1>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> New Note
              </Button>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-lg font-semibold mb-4">Record a New Note</h2>
              <AudioRecorder onTranscriptionComplete={handleTranscriptionComplete} />
            </div>
            <div className="space-y-8">
              {Object.entries(notesByCategory).map(([category, categoryNotes]) => (
                <div key={category} className="space-y-4">
                  <h2 className="text-2xl font-semibold">{category}</h2>
                  {categoryNotes.map((note) => (
                    <NoteCard key={note.id} {...note} />
                  ))}
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No notes yet. Start recording to create your first note!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
