"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { motion } from "framer-motion";
import { 
  Play, 
  BookOpen, 
  Award, 
  Clock, 
  Search, 
  ChevronRight,
  TrendingUp,
  Star,
  CheckCircle2,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/layout/AuthProvider";

const MOCK_COURSES = [
  {
    id: "1",
    title: "Engineering Excellence: Code Standards",
    description: "Learn the high-performance coding standards at Namaah Tech.",
    thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?q=80&w=2128&auto=format&fit=crop",
    category: "Engineering",
    duration: "45m",
    lessons: 12,
    progress: 65,
    instructor: "Aryan K."
  },
  {
    id: "2",
    title: "Sales Mastery: The Namaah Pitch",
    description: "Master the art of high-ticket sales and client acquisition.",
    thumbnail: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=2070&auto=format&fit=crop",
    category: "Sales",
    duration: "1h 20m",
    lessons: 8,
    progress: 0,
    instructor: "Priya S."
  },
  {
    id: "3",
    title: "Cybersecurity & Data Privacy",
    description: "Essential training on protecting company and client data.",
    thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop",
    category: "Compliance",
    duration: "30m",
    lessons: 5,
    progress: 100,
    instructor: "Security Team"
  }
];

export default function TrainingAcademyPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(MOCK_COURSES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardShell
      title="Training Academy"
      subtitle="Expand your skills and earn certifications to boost your performance score."
      actions={
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-theme-fg transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-theme-surface border border-theme-border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary/20 w-64 transition-all"
            />
          </div>
          <Button variant="secondary" size="sm">
            <Award size={14} className="mr-2" /> My Certificates
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        
        {/* Featured Section */}
        <div className="relative h-[300px] rounded-3xl overflow-hidden group">
          <img 
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            alt="Academy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 p-10 flex flex-col justify-center max-w-xl">
            <Badge variant="success" className="w-fit mb-4">New Release</Badge>
            <h2 className="text-4xl font-black text-white mb-4 leading-tight">Advanced Systems Design & Scaling</h2>
            <p className="text-zinc-300 mb-6 text-sm">Join our Chief Architect Aryan as he breaks down the Namaah Pulse core engine and how we handle 1M+ concurrent transactions.</p>
            <div className="flex items-center gap-4">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-8">
                <Play size={18} fill="currentColor" className="mr-2" /> Start Now
              </Button>
              <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-widest">
                <Clock size={14} /> 2h 45m Course
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Active Courses", value: "3", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Hours Learned", value: "12.5", icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
            { label: "Certificates", value: "5", icon: Award, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Academy Rank", value: "#14", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
          ].map((stat, i) => (
            <div key={i} className="page-card flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-theme-muted tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-theme-fg">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Course Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Star className="text-amber-500" size={20} fill="currentColor" /> Recommended for You
            </h3>
            <div className="flex gap-2">
              {['All', 'Engineering', 'Sales', 'HR'].map(cat => (
                <button 
                  key={cat}
                  className="px-4 py-1.5 rounded-full text-xs font-bold border border-theme-border hover:border-theme-primary hover:text-theme-primary transition-all"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <motion.div 
                key={course.id}
                whileHover={{ y: -5 }}
                className="group cursor-pointer"
              >
                <div className="bg-theme-surface border border-theme-border rounded-[2rem] overflow-hidden shadow-xl shadow-black/5 flex flex-col h-full">
                  <div className="relative aspect-video overflow-hidden">
                    <img 
                      src={course.thumbnail} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      alt={course.title}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-lg">
                        <Play size={20} fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px]">{course.category}</Badge>
                    </div>
                    {course.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-1000" 
                          style={{ width: `${course.progress}%` }} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">{course.instructor}</p>
                      <div className="flex items-center gap-1.5 text-theme-muted text-[10px] font-bold">
                        <Clock size={10} /> {course.duration}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold mb-2 group-hover:text-theme-primary transition-colors">{course.title}</h4>
                    <p className="text-xs text-theme-muted line-clamp-2 mb-6 flex-1">{course.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-theme-border">
                      <div className="flex items-center gap-1.5 text-theme-muted text-[10px] font-black">
                        <BookOpen size={12} /> {course.lessons} LESSONS
                      </div>
                      <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                        {course.progress === 100 ? (
                          <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Completed</span>
                        ) : (
                          <span className="text-theme-muted">Start Course <ChevronRight size={14} className="inline" /></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
