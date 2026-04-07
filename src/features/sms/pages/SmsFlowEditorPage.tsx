import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { mockAutomations } from '../data/mockAutomations';
import FlowEditor from '../components/automations/FlowEditor';
import NodePalette from '../components/automations/NodePalette';
import NodeConfigPanel from '../components/automations/NodeConfigPanel';
import type { SmsFlowNodeData } from '../types';

export default function SmsFlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const automation = mockAutomations.find((a) => a.id === id);

  const [flowName, setFlowName] = useState(automation?.name || 'Untitled Flow');
  const [isActive, setIsActive] = useState(automation?.isActive ?? false);
  const [selectedNode, setSelectedNode] = useState<{ id: string; data: SmsFlowNodeData } | null>(
    null
  );

  const handleNodeClick = useCallback(
    (node: { id: string; data: SmsFlowNodeData } | null) => {
      setSelectedNode(node);
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      // Find the flow editor wrapper and call updateNodeConfig
      const wrapper = editorWrapperRef.current?.querySelector('[data-flow-editor]') as
        | (HTMLDivElement & { __editor?: { updateNodeConfig: (id: string, c: Record<string, unknown>) => void } })
        | null;
      wrapper?.__editor?.updateNodeConfig(nodeId, config);

      // Update selected node locally
      setSelectedNode((prev) => {
        if (!prev || prev.id !== nodeId) return prev;
        return { ...prev, data: { ...prev.data, config } };
      });

      toast.success('Node updated');
    },
    []
  );

  const handleSave = useCallback(() => {
    toast.success('Flow saved');
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full" ref={editorWrapperRef}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E5E7EB] bg-white flex-shrink-0">
          <button
            onClick={() => navigate('/sms/automations')}
            className="p-1.5 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="max-w-[240px] h-8 rounded-lg border-[#E5E7EB] text-sm font-medium text-[#1A1A1A]"
          />

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280]">
              {isActive ? 'Active' : 'Inactive'}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <Button
            onClick={handleSave}
            className="bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-xl gap-1.5 h-8 px-3 text-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>

        {/* Canvas area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left palette - hidden on mobile */}
          {!isMobile && <NodePalette />}

          {/* Flow canvas */}
          <FlowEditor onNodeClick={handleNodeClick} />

          {/* Right config panel - only when node selected */}
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onUpdate={handleNodeUpdate}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
