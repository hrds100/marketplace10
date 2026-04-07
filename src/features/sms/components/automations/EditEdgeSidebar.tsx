import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  SmsEdgeConditionOperator,
  SmsEdgeLogicalOperator,
  type SmsEdgeCondition,
  type SmsEdgeData,
} from '../../types';
import { useFlowContext } from './FlowContext';

export function EditEdgeSidebar() {
  const { isEditingEdge, setIsEditingEdge, edges, updateEdge, deleteEdge } = useFlowContext();

  const edge = edges.find((e) => e.id === isEditingEdge);
  const edgeData = (edge?.data || {}) as SmsEdgeData;

  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState<SmsEdgeCondition[]>([]);

  useEffect(() => {
    if (edge) {
      setLabel(edgeData.label || '');
      setDescription(edgeData.description || '');
      setConditions(edgeData.conditions || []);
    }
  }, [edge, edgeData.label, edgeData.description, edgeData.conditions]);

  const handleSave = useCallback(() => {
    if (!isEditingEdge) return;
    updateEdge(isEditingEdge, { label, description, conditions });
    toast.success('Pathway updated');
    setIsEditingEdge(null);
  }, [isEditingEdge, label, description, conditions, updateEdge, setIsEditingEdge]);

  const handleDelete = useCallback(() => {
    if (!isEditingEdge) return;
    deleteEdge(isEditingEdge);
    toast.success('Pathway deleted');
  }, [isEditingEdge, deleteEdge]);

  const addCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      {
        operator: SmsEdgeLogicalOperator.AND,
        field: 'message',
        conditionOperator: SmsEdgeConditionOperator.CONTAIN,
        value: '',
      },
    ]);
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCondition = useCallback(
    (index: number, updates: Partial<SmsEdgeCondition>) => {
      setConditions((prev) =>
        prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
      );
    },
    []
  );

  if (!isEditingEdge || !edge) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[350px] bg-white border-l border-[#E5E7EB] z-50 flex flex-col shadow-lg animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Edit Pathway</h3>
        <button
          onClick={() => setIsEditingEdge(null)}
          className="p-1.5 rounded-lg hover:bg-[#F9FAFB] text-[#9CA3AF] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Label */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-[#6B7280]">Pathway Label</Label>
            <span className="text-[10px] text-[#9CA3AF]">{label.length}/100</span>
          </div>
          <Textarea
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 100))}
            placeholder="e.g. User interested"
            rows={2}
            className="rounded-lg border-[#E5E7EB] resize-none text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When should this pathway be taken?"
            rows={3}
            className="rounded-lg border-[#E5E7EB] resize-none text-sm"
          />
        </div>

        {/* Conditions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-[#6B7280]">Conditions</Label>
            <button
              onClick={addCondition}
              className="flex items-center gap-1 text-xs font-medium text-[#1E9A80] hover:text-[#1E9A80]/80 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          {conditions.length === 0 && (
            <p className="text-xs text-[#9CA3AF]">No conditions — pathway always available.</p>
          )}

          {conditions.map((condition, index) => (
            <div key={index} className="space-y-2 p-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
              {index > 0 && (
                <Select
                  value={condition.operator}
                  onValueChange={(v) =>
                    updateCondition(index, { operator: v as SmsEdgeLogicalOperator })
                  }
                >
                  <SelectTrigger className="h-7 rounded-md border-[#E5E7EB] text-xs w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SmsEdgeLogicalOperator.AND}>AND</SelectItem>
                    <SelectItem value={SmsEdgeLogicalOperator.OR}>OR</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={condition.field}
                  onChange={(e) => updateCondition(index, { field: e.target.value })}
                  placeholder="Field"
                  className="h-7 rounded-md border-[#E5E7EB] text-xs flex-1"
                />
                <button
                  onClick={() => removeCondition(index)}
                  className="p-1 rounded hover:bg-[#EF4444]/10 text-[#9CA3AF] hover:text-[#EF4444] transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <Select
                value={condition.conditionOperator}
                onValueChange={(v) =>
                  updateCondition(index, { conditionOperator: v as SmsEdgeConditionOperator })
                }
              >
                <SelectTrigger className="h-7 rounded-md border-[#E5E7EB] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SmsEdgeConditionOperator.CONTAIN}>Contains</SelectItem>
                  <SelectItem value={SmsEdgeConditionOperator.DOES_NOT_CONTAIN}>Does not contain</SelectItem>
                  <SelectItem value={SmsEdgeConditionOperator.EQUALS}>Equals</SelectItem>
                  <SelectItem value={SmsEdgeConditionOperator.DOES_NOT_EQUAL}>Does not equal</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={condition.value}
                onChange={(e) => updateCondition(index, { value: e.target.value })}
                placeholder="Value"
                className="h-7 rounded-md border-[#E5E7EB] text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#E5E7EB] space-y-2">
        <Button
          onClick={handleSave}
          className="w-full bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-xl"
        >
          Save
        </Button>
        <Button
          onClick={handleDelete}
          variant="outline"
          className="w-full rounded-xl border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
        >
          Delete Pathway
        </Button>
      </div>
    </div>
  );
}
