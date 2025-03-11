import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import nlp from "compromise";
import numbers from 'compromise-numbers';
import NoteCard from "./NoteCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

nlp.extend(numbers);

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, category: string, tags: string[]) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editableTranscription, setEditableTranscription] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const categorizeContent = (text: string): string => {
    const doc = nlp(text.toLowerCase());
    
    // Project category indicators
    if (doc.match('(project|timeline|deadline|milestone|deliverable)').found) {
      return "Project";
    }
    
    // Meeting category indicators
    if (doc.match('(meet|discuss|call|conference|sync|agenda|minutes)').found) {
      return "Meeting";
    }
    
    // Lecture category indicators
    if (doc.match('(lecture|class|course|study|learn|teacher|professor)').found) {
      return "Lecture";
    }
    
    // Task category indicators
    if (doc.match('(todo|task|action|assign|complete|finish)').found) {
      return "Task";
    }
    
    // Idea category indicators
    if (doc.match('(idea|brainstorm|concept|strategy|innovation)').found) {
      return "Idea";
    }
    
    // Reminder category indicators
    if (doc.match('(remind|remember|don\'t forget|reminder)').found) {
      return "Reminder";
    }

    return "General";
  };

  const extractTags = (text: string): string[] => {
    const doc = nlp(text);
    const tags = new Set<string>();

    // Extract topics (nouns that appear multiple times)
    const nouns = doc.nouns().out('array');
    const frequentNouns = nouns.filter((noun: string) => 
      nouns.filter(n => n === noun).length > 1
    );

    // Extract organizations
    const organizations = doc.organizations().out('array');

    // Extract key terms using patterns
    const keyTerms = doc.match('#Noun+ (#Preposition #Noun+)?').out('array');

    // Combine all potential tags
    [...frequentNouns, ...organizations, ...keyTerms].forEach(tag => {
      // Only add tags that are between 3 and 20 characters
      if (tag.length >= 3 && tag.length <= 20) {
        tags.add(tag.toLowerCase());
      }
    });

    return Array.from(tags).slice(0, 5); // Limit to top 5 tags
  };

  const extractActionItems = (text: string): string[] => {
    const actionPatterns = [
      /(?:need to|must|should|will|going to|plan to)\s+([^,.!?]+)/gi,
      /(?:submit|prepare|review|complete|send|schedule)\s+([^,.!?]+)(?:\s+by\s+[^,.!?]+)?/gi,
      /(?:deadline|due|by)\s+([^,.!?]+)/gi
    ];

    const actions = new Set<string>();
    actionPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[0]) {
          actions.add(match[0].trim());
        }
      }
    });

    return Array.from(actions);
  };

  const extractHighlights = (text: string): string[] => {
    const doc = nlp(text);

    // Extract key topics
    const nouns = doc.nouns().out('array');
    const frequentNouns = nouns.filter((noun: string) => 
      nouns.filter(n => n === noun).length > 1
    );

    // Extract organizations and people
    const organizations = doc.organizations().out('array');
    const people = doc.people().out('array');

    // Extract dates (using simple pattern matching)
    const datePattern = '(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
    const dates = doc.match(datePattern).out('array');
    const numbers = doc.numbers().out('array');

    // Combine all highlights and remove duplicates
    const allHighlights = [...new Set([
      ...dates,
      ...frequentNouns,
      ...organizations,
      ...people,
      ...numbers
    ])];

    return allHighlights.filter(h => h.length > 2);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioBytes = btoa(
        new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const response = await fetch("http://localhost:3001/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audio: audioBytes }),
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe audio");
      }

      const data = await response.json();
      return data.transcription || "No transcription available";
    } catch (error) {
      console.error("Transcription error:", error);
      throw error;
    }
  };

  const highlightText = (text: string, highlights: string[], actions: string[]) => {
    let parts = text.split(new RegExp(`(${[...highlights, ...actions].join('|')})`, 'gi'));
    return parts.map((part, index) => {
      if (highlights.some(h => part.toLowerCase().includes(h.toLowerCase()))) {
        return (
          <span key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </span>
        );
      } else if (actions.some(a => part.toLowerCase().includes(a.toLowerCase()))) {
        return (
          <span key={index} className="bg-green-200 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000,
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        toast({
          title: "Processing Audio",
          description: "Please wait while we process your recording...",
        });

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });

        try {
          const transcription = await transcribeAudio(audioBlob);
          
          const cleanedTranscription = transcription
            .replace(/(\w)\s+(?=[,.!?])/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();

          const highlights = extractHighlights(cleanedTranscription);
          const actions = extractActionItems(cleanedTranscription);
          const detectedCategory = categorizeContent(cleanedTranscription);
          const extractedTags = extractTags(cleanedTranscription);

          setTranscription(cleanedTranscription);
          setHighlights(highlights);
          setActionItems(actions);
          setCategory(detectedCategory);
          setTags(extractedTags);
          
          onTranscriptionComplete(cleanedTranscription, detectedCategory, extractedTags);
          
          toast({
            title: "Transcription Complete",
            description: "Your audio has been successfully transcribed.",
          });
        } catch (error) {
          console.error("Final transcription error:", error);
          toast({
            title: "Transcription Error",
            description: "Failed to transcribe audio. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Your microphone is now active.",
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleEditComplete = () => {
    setTranscription(editableTranscription);
    const newHighlights = extractHighlights(editableTranscription);
    const newActions = extractActionItems(editableTranscription);
    const newCategory = categorizeContent(editableTranscription);
    const newTags = extractTags(editableTranscription);
    setHighlights(newHighlights);
    setActionItems(newActions);
    setCategory(newCategory);
    setTags(newTags);
    setIsFullscreen(false);
    onTranscriptionComplete(editableTranscription, newCategory, newTags);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          className={`rounded-full w-16 h-16 p-0 relative overflow-hidden transition-all duration-300 ${
            isRecording ? "bg-red-500 hover:bg-red-600" : ""
          }`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isRecording ? (
            <Square className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
          {isRecording && (
            <span className="absolute inset-0 animate-ripple bg-white/30 rounded-full" />
          )}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {isProcessing
          ? "Processing audio..."
          : isRecording
          ? "Recording... Click to stop"
          : "Click to start recording"}
      </p>
      {transcription && (
        <div className="w-full">
          <NoteCard
            title={`Note - ${category}`}
            content={highlightText(transcription, highlights, actionItems)}
            timestamp={new Date().toLocaleString()}
            category={category}
            tags={tags}
            onExpand={() => {
              setEditableTranscription(transcription);
              setIsFullscreen(true);
            }}
          />
        </div>
      )}

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Edit your note and save changes. Highlights will be updated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col h-full gap-4">
            <Textarea
              className="flex-1 min-h-[300px]"
              value={editableTranscription}
              onChange={(e) => setEditableTranscription(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsFullscreen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditComplete}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AudioRecorder;
