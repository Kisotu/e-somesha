import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuizzes, useQuestions } from '@/hooks/useQuizzes';
import { useCourses } from '@/hooks/useCourses';
import type { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QuizBuilder() {
  const { id, quizId } = useParams<{ id: string, quizId: string }>();
  const courseId = parseInt(id || '0');
  const qId = parseInt(quizId || '0');
  
  const { courses } = useCourses();
  const { quizzes } = useQuizzes(courseId);
  const quiz = quizzes.find(q => q.id === qId);
  const course = courses.find(c => c.id === courseId);

  const { questions, isLoading, createQuestion, updateQuestion, deleteQuestion } = useQuestions(qId);

  const [isOpen, setIsOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [form, setForm] = useState<{
    content: string;
    type: Question['type'];
    points: number;
    options: string[];
    correct_answer: string;
  }>({
    content: '',
    type: 'multiple-choice',
    points: 10,
    options: ['', '', '', ''],
    correct_answer: ''
  });

  if (!quiz) return <div className="p-8">Quiz not found</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQ) {
        await updateQuestion({ id: editingQ.id, ...form });
        toast.success('Question updated');
      } else {
        await createQuestion({ ...form, quiz_id: qId });
        toast.success('Question added');
      }
      setIsOpen(false);
      setEditingQ(null);
      setForm({ content: '', type: 'multiple-choice', points: 10, options: ['', '', '', ''], correct_answer: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save question');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to={`/courses/${courseId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{quiz.title}</h1>
            <p className="text-muted-foreground">Builder • {course?.title} ({course?.code})</p>
          </div>
        </div>
        <Button onClick={() => { setEditingQ(null); setIsOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Question
        </Button>
      </div>

      <div className="grid gap-6">
        {questions.map((q, idx) => (
          <Card key={q.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">Question {idx + 1}</CardTitle>
                <p className="font-medium text-slate-700">{q.content}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => { 
                  setEditingQ(q); 
                  setForm({ 
                    content: q.content, 
                    type: q.type, 
                    points: q.points, 
                    options: q.options || ['', '', '', ''], 
                    correct_answer: q.correct_answer 
                  }); 
                  setIsOpen(true); 
                }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-destructive" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {q.options?.map((opt, i) => (
                  <div key={i} className={`p-3 rounded-md border flex items-center justify-between ${opt === q.correct_answer ? 'bg-green-50 border-green-200' : 'bg-slate-50'}`}>
                    <span>{opt}</span>
                    {opt === q.correct_answer && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{q.points} Points • {q.type}</p>
            </CardContent>
          </Card>
        ))}
        {questions.length === 0 && !isLoading && (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">No questions yet. Click "Add Question" to start building your quiz.</p>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingQ ? 'Edit Question' : 'New Question'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Question Text</Label>
              <Input value={form.content} onChange={e => setForm({...form, content: e.target.value})} required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value as Question['type']})}>
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True/False</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Points</Label>
                <Input type="number" value={form.points} onChange={e => setForm({...form, points: parseInt(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Options</Label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input 
                    placeholder={`Option ${i+1}`} 
                    value={opt} 
                    onChange={e => {
                      const newOpts = [...form.options];
                      newOpts[i] = e.target.value;
                      setForm({...form, options: newOpts});
                    }}
                    required
                  />
                  <Button 
                    type="button" 
                    variant={form.correct_answer === opt && opt !== '' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({...form, correct_answer: opt})}
                  >
                    Correct
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter><Button type="submit">{editingQ ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
