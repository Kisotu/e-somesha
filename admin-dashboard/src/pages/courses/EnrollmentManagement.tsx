import React, { useState } from 'react';
import { useCourses } from '@/hooks/useCourses';
import { useAllUsers } from '@/hooks/useUsers';
import { useEnrollment } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function EnrollmentManagement() {
  const { courses } = useCourses();
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { enroll, isEnrolling } = useEnrollment();

  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  const handleEnroll = async () => {
    if (!selectedCourse || !selectedUser) {
      toast.error('Please select both a course and a user');
      return;
    }

    try {
      await enroll({ 
        courseId: parseInt(selectedCourse), 
        userId: parseInt(selectedUser) 
      });
      toast.success('User enrolled successfully');
      setSelectedUser('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Enrollment failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enrollments</h1>
        <p className="text-muted-foreground">Manage student enrollments in courses.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Quick Enroll</CardTitle>
            <CardDescription>Add a student or lecturer to a course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="course">Select Course</Label>
                <select
                  id="course"
                  className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <option value="">Choose a course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>[{c.code}] {c.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user">Select User</Label>
                <select
                  id="user"
                  className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  disabled={usersLoading}
                >
                  <option value="">{usersLoading ? 'Loading users...' : 'Choose a user...'}</option>
                  {users?.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email} - {u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <Button 
                onClick={handleEnroll} 
                disabled={isEnrolling || !selectedCourse || !selectedUser}
                className="w-full md:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" /> 
              {isEnrolling ? 'Enrolling...' : 'Enroll User'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
