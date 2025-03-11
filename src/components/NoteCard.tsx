
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Tag, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoteCardProps {
  title: string;
  content: React.ReactNode;
  timestamp: string;
  category: string;
  tags?: string[];
  onExpand?: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ title, content, timestamp, category, tags = [], onExpand }) => {
  return (
    <Card className="w-full transition-all duration-300 hover:shadow-lg animate-fade-up">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {category}
            </Badge>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {onExpand && (
          <Button variant="ghost" size="icon" onClick={onExpand}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timestamp}
        </div>
        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </CardContent>
    </Card>
  );
};

export default NoteCard;
