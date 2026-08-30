import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { SubField } from '@/features/formTypes';

interface ObjectListInputProps {
  value: Record<string, string>[];
  onChange: (value: Record<string, string>[]) => void;
  subFields: SubField[];
}

/** Edit an array of uniform objects, e.g. comparison rows or FAQ items. */
export function ObjectListInput({ value, onChange, subFields }: ObjectListInputProps) {
  const rows = value ?? [];

  const addRow = () => {
    const empty = Object.fromEntries(subFields.map((f) => [f.name, '']));
    onChange([...rows, empty]);
  };

  const updateRow = (index: number, key: string, val: string) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, [key]: val } : r)));
  };

  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5"
            >
              <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${subFields.length}, minmax(0, 1fr))` }}>
                {subFields.map((sf) =>
                  sf.type === 'textarea' ? (
                    <Textarea
                      key={sf.name}
                      rows={2}
                      placeholder={sf.placeholder ?? sf.label}
                      value={row[sf.name] ?? ''}
                      onChange={(e) => updateRow(i, sf.name, e.target.value)}
                      className="bg-card"
                    />
                  ) : (
                    <Input
                      key={sf.name}
                      placeholder={sf.placeholder ?? sf.label}
                      value={row[sf.name] ?? ''}
                      onChange={(e) => updateRow(i, sf.name, e.target.value)}
                      className="bg-card"
                    />
                  ),
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeRow(i)}
                className="mt-0.5 text-muted-foreground hover:text-destructive"
                aria-label="Remove row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4" />
        Add row
      </Button>
    </div>
  );
}
