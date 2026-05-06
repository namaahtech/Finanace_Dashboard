"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { 
  Plus, 
  Users, 
  BookOpen, 
  Award, 
  BarChart3, 
  MoreVertical,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";

const MOCK_STATS = [
  { label: "Total Courses", value: "24", icon: BookOpen, color: "text-blue-500" },
  { label: "Enrolled Students", value: "142", icon: Users, color: "text-purple-500" },
  { label: "Certifications Issued", value: "89", icon: Award, color: "text-emerald-500" },
  { label: "Avg. Progress", value: "72%", icon: BarChart3, color: "text-amber-500" },
];

const MOCK_COURSES = [
  { id: "1", title: "Engineering Excellence", category: "Engineering", students: 45, status: "Published", completion: "78%" },
  { id: "2", title: "Sales Mastery", category: "Sales", students: 32, status: "Published", completion: "45%" },
  { id: "3", title: "Cybersecurity 101", category: "Compliance", students: 65, status: "Draft", completion: "0%" },
];

export default function AdminLMSPage() {
  const [activeTab, setActiveTab] = useState("courses");
  const [stats, setStats] = useState(MOCK_STATS);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLMSData();
  }, []);

  const fetchLMSData = async () => {
    try {
      // 1. Fetch Stats
      const { count: courseCount } = await supabase.from('lms_courses').select('*', { count: 'exact', head: true });
      const { count: enrollmentCount } = await supabase.from('lms_enrollments').select('*', { count: 'exact', head: true });
      const { count: certCount } = await supabase.from('lms_certifications').select('*', { count: 'exact', head: true });
      
      setStats([
        { label: "Total Courses", value: String(courseCount || 0), icon: BookOpen, color: "text-blue-500" },
        { label: "Enrolled Students", value: String(enrollmentCount || 0), icon: Users, color: "text-purple-500" },
        { label: "Certifications Issued", value: String(certCount || 0), icon: Award, color: "text-emerald-500" },
        { label: "Avg. Progress", value: "72%", icon: BarChart3, color: "text-amber-500" },
      ]);

      // 2. Fetch Courses
      const { data: courseData } = await supabase
        .from('lms_courses')
        .select('*, enrollments:lms_enrollments(progress_percent)')
        .order('created_at', { ascending: false });

      if (courseData) {
        const formatted = courseData.map(c => ({
          id: c.id,
          title: c.title,
          category: c.category,
          students: c.enrollments?.length || 0,
          status: c.status === 'published' ? 'Published' : 'Draft',
          completion: c.enrollments?.length 
            ? `${Math.round(c.enrollments.reduce((acc: number, curr: any) => acc + curr.progress_percent, 0) / c.enrollments.length)}%`
            : '0%'
        }));
        setCourses(formatted);
      }
    } catch (err) {
      console.error("LMS Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell
      title="Academy Manager"
      subtitle="Manage your training curriculum, track employee progress, and issue certifications."
      actions={
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold" onClick={() => window.location.href = '/admin/lms/courses/new'}>
          <Plus size={16} className="mr-2" /> Create New Course
        </Button>
      }
    >
      <div className="space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="page-card flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl bg-theme-raised flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-theme-muted tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-theme-fg">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Engagement Heatmap */}
          <div className="lg:col-span-2 page-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                <BarChart3 size={16} /> Learning Engagement Heatmap
              </h3>
              <Badge variant="success">Peak: 11 AM - 2 PM</Badge>
            </div>
            <div className="h-64 flex items-end gap-1 px-2">
              {Array.from({ length: 24 }).map((_, i) => {
                const height = Math.random() * 80 + 20;
                return (
                  <div key={i} className="flex-1 group relative">
                    <div 
                      className="w-full bg-theme-primary/20 rounded-t-md group-hover:bg-theme-primary transition-all duration-500" 
                      style={{ height: `${height}%` }}
                    />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-[8px] p-1 rounded font-bold">
                      {Math.round(height)}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4 px-2 text-[8px] font-black text-theme-muted uppercase tracking-widest">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* Quick Cert Queue */}
          <div className="page-card">
            <h3 className="text-sm font-black uppercase tracking-widest text-theme-muted mb-6 flex items-center gap-2">
              <Award size={16} /> Pending Certificates
            </h3>
            <div className="space-y-4">
              {[
                { name: "John Doe", course: "Engineering Excellence", date: "2m ago" },
                { name: "Sarah Smith", course: "Sales Mastery", date: "15m ago" },
                { name: "Mike Ross", course: "Security 101", date: "1h ago" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-theme-raised/50 rounded-xl border border-theme-border/50">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-theme-fg truncate">{item.name}</p>
                    <p className="text-[10px] text-theme-muted truncate">{item.course}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] font-black text-emerald-500 hover:text-emerald-400">
                    Issue
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="w-full mt-6 text-[10px] font-black uppercase tracking-widest py-4">
              View All Queue
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="page-card p-0 overflow-hidden">
          <div className="border-b border-theme-border flex items-center justify-between px-6">
            <div className="flex gap-8">
              {['courses', 'students', 'certifications'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                    activeTab === tab ? "text-theme-primary" : "text-theme-muted hover:text-theme-fg"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={12} />
                <input 
                  type="text" 
                  placeholder="Filter..." 
                  className="bg-theme-page border border-theme-border rounded-lg pl-8 pr-4 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-theme-primary"
                />
              </div>
              <Button variant="ghost" size="sm">
                <Filter size={14} />
              </Button>
            </div>
          </div>

          <div className="p-0">
            {loading ? (
               <div className="p-12 text-center text-theme-muted font-black uppercase tracking-widest text-xs">
                 <Loader2 className="animate-spin inline mr-2" size={16} /> Fetching Academy Data...
               </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-black uppercase tracking-widest text-theme-muted bg-theme-page/50 border-b border-theme-border">
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Enrolled</th>
                    <th className="px-6 py-4">Avg. Progress</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {(courses.length > 0 ? courses : MOCK_COURSES).map((course) => (
                    <tr key={course.id} className="group hover:bg-theme-raised/30 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-theme-raised flex items-center justify-center text-theme-muted">
                            <BookOpen size={16} />
                          </div>
                          <span className="font-bold text-theme-fg">{course.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="text-[10px]">{course.category}</Badge>
                      </td>
                      <td className="px-6 py-4 font-medium text-theme-muted">{course.students} Users</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-theme-raised overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: course.completion }} />
                          </div>
                          <span className="text-[10px] font-bold text-theme-muted">{course.completion}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={course.status === "Published" ? "success" : "default"}>
                          {course.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Eye size={14} /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sky-500"><Edit3 size={14} /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500"><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
