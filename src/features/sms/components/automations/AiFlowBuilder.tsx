import { useState, useCallback } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SmsNodeType, type SmsNodeData, type SmsEdgeData } from '../../types';
import { useFlowContext } from './FlowContext';
import type { Node, Edge } from '@xyflow/react';

const FLOW_BUILDER_SYSTEM_PROMPT = `You are a conversational flow builder for an SMS automation system.

Generate a complete flow based on the user's description.

Output a valid JSON object with this EXACT structure:
{
  "globalPrompt": "System prompt that applies to all AI responses...",
  "nodes": [
    {
      "id": "n-1",
      "type": "DEFAULT",
      "position": {"x": 300, "y": 0},
      "data": {
        "name": "AI Response",
        "isStart": true,
        "prompt": "The AI instructions for this node...",
        "modelOptions": {"temperature": 0.7}
      }
    }
  ],
  "edges": [
    {
      "id": "e-1-2",
      "source": "n-1",
      "target": "n-2",
      "type": "custom",
      "data": {
        "label": "User interested",
        "description": "Select this pathway if the user expresses interest or says yes"
      }
    }
  ]
}

Node types available: DEFAULT, STOP_CONVERSATION, FOLLOW_UP, TRANSFER, LABEL, MOVE_STAGE, WEBHOOK

Rules:
- First node must have "isStart": true
- Use descriptive edge labels that help AI classify responses
- Include edge descriptions that explain when to follow each pathway
- Position nodes in a tree layout (x: 100-800, y increments of 180)
- Use STOP_CONVERSATION for endpoints
- Use FOLLOW_UP for timed sequences (include "steps" array with waitMinutes)
- Make prompts specific and conversational
- Go at least 4-6 levels deep in the conversation
- Return ONLY valid JSON, no markdown`;

interface GeneratedFlow {
  globalPrompt: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    data: Record<string, unknown>;
  }>;
}

function validateFlowJson(parsed: unknown): parsed is GeneratedFlow {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) return false;
  if (!Array.isArray(obj.edges)) return false;
  if (typeof obj.globalPrompt !== 'string') return false;

  // Validate each node has required fields
  for (const node of obj.nodes) {
    if (!node.id || !node.type || !node.position || !node.data) return false;
  }
  // Validate first node is start
  const firstNode = obj.nodes[0] as { data?: { isStart?: boolean } };
  if (!firstNode.data?.isStart) return false;

  return true;
}

interface AiFlowBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiFlowBuilder({ open, onOpenChange }: AiFlowBuilderProps) {
  const { setNodes, setEdges, setGlobalPrompt } = useFlowContext();
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) {
      toast.error('Please describe what you want the flow to do');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('sms-ai-respond', {
        body: {
          system_prompt: FLOW_BUILDER_SYSTEM_PROMPT,
          user_message: description.trim(),
          model: 'gpt-5.4',
          max_tokens: 2000,
        },
      });

      if (error) throw new Error(error.message || 'AI request failed');

      const responseText: string = typeof data === 'string' ? data : (data?.reply || data?.response || data?.content || JSON.stringify(data));

      // Try to extract JSON from the response (strip markdown fences if present)
      let jsonStr = responseText;
      const fenceMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error('AI returned invalid JSON. Please try again with a clearer description.');
      }

      if (!validateFlowJson(parsed)) {
        throw new Error('AI returned an incomplete flow structure. Please try again.');
      }

      const flow = parsed as GeneratedFlow;

      // Map nodes to proper ReactFlow format
      const newNodes: Node<SmsNodeData>[] = flow.nodes.map((n) => ({
        id: n.id,
        type: n.type as SmsNodeType,
        position: n.position,
        data: n.data as SmsNodeData,
      }));

      const newEdges: Edge<SmsEdgeData>[] = flow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'custom',
        data: (e.data || {}) as SmsEdgeData,
      }));

      setNodes(newNodes);
      setEdges(newEdges);
      setGlobalPrompt(flow.globalPrompt);

      toast.success('Flow generated successfully');
      onOpenChange(false);
      setDescription('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate flow');
    } finally {
      setIsGenerating(false);
    }
  }, [description, setNodes, setEdges, setGlobalPrompt, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">
            AI Flow Builder
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B7280]">
            Describe what you want your automation to do in plain English. AI will generate the full flow with nodes, pathways, and prompts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Ask if they want to join our WhatsApp group. If yes, share the group URL. If no, ask why and try to convince them..."
            rows={6}
            className="rounded-lg border-[#E5E7EB] resize-none text-sm"
            disabled={isGenerating}
          />
          <p className="text-[10px] text-[#9CA3AF] text-right">
            {description.length} characters
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            className="bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-xl px-6 gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate Flow
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
