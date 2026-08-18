import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Sparkles, Loader, AlertTriangle } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import StatRing from "../../components/shared/StatRing";
import { detectPattern, buildInsightText } from "../../utils/patterns";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./InsightsPage.css";

export default function InsightsPage() {
  const [data, setData] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const { data: d } = await api.get("/student/insights");
      setData(d);
    } catch {
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsight = async () => {
    if (!data) return;
    setAiLoading(true);
    try {
      const { data: d } = await api.post("/student/ai-insight", {
        history: data.history,
        courseName: data.courses?.map(c => c.courseCode).join(", "),
      });
      setAiInsight(d.insight);
    } catch {
      // Fallback to local pattern
      const pattern = detectPattern(data.allHistory || []);
      setAiInsight(buildInsightText(pattern));
      toast("Using offline analysis", { icon: "ℹ️" });
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return (
    <div className="page">
      <TopBar title="My Insights" back="/student" />
      <div className="insights-loading"><Loader size={28} className="spin-anim" /></div>
    </div>
  );

  const pattern = detectPattern(data?.allHistory || []);

  const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const heatmapData = data?.heatmap || heatmapDays.map(d => ({
    day: d, present: 0, late: 0, absent: 0
  }));

  const courseBreakdown = data?.courses || [];

  return (
    <div className="page">
      <TopBar title="My Insights" back="/student" showLogout />

      <div className="insights-content">
        {/* Pattern card */}
        <div className="pattern-card card animate-fadeUp">
          <div className="pattern-header">
            <div>
              <p className="pattern-label">Your Attendance Pattern</p>
              <h2 className="pattern-title">
                {pattern.emoji} {pattern.label}
              </h2>
            </div>
            {pattern.atRisk && (
              <div className="risk-pill">
                <AlertTriangle size={13} />
                At Risk
              </div>
            )}
          </div>
          <div className="pattern-stats">
            <div className="p-stat">
              <StatRing value={pattern.pct.present} size={72} stroke={6} color="var(--green)" />
              <span>Present</span>
            </div>
            <div className="p-stat">
              <StatRing value={pattern.pct.late} size={72} stroke={6} color="var(--amber)" />
              <span>Late</span>
            </div>
            <div className="p-stat">
              <StatRing value={pattern.pct.absent} size={72} stroke={6} color="var(--red)" />
              <span>Absent</span>
            </div>
          </div>
          <div className="streak-info">
            🔥 <strong>{pattern.streak}</strong> consecutive sessions attended
          </div>
        </div>

        {/* AI insight */}
        <div className="ai-insight-card card animate-fadeUp">
          <div className="ai-header">
            <div className="ai-icon"><Sparkles size={16} /></div>
            <div>
              <h3 className="ai-title">AI Analysis</h3>
              <p className="ai-sub">Powered by Claude</p>
            </div>
          </div>
          {aiInsight ? (
            <p className="ai-text">{aiInsight}</p>
          ) : (
            <button className="btn btn-secondary ai-btn" onClick={fetchAIInsight} disabled={aiLoading}>
              {aiLoading ? <><span className="auth-spinner" style={{ borderColor: "var(--text-muted)", borderTopColor: "var(--text-primary)" }} /> Analysing...</> : <><Sparkles size={15} /> Generate AI Summary</>}
            </button>
          )}
        </div>

        {/* Heatmap */}
        <div className="heatmap-card card animate-fadeUp">
          <h3 className="section-title" style={{ marginBottom: 16 }}>Weekly Heatmap</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={heatmapData} barSize={14} barGap={3}>
              <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--text-primary)" }}
              />
              <Bar dataKey="present" name="Present" stackId="a" fill="var(--green)" radius={[0,0,0,0]} />
              <Bar dataKey="late" name="Late" stackId="a" fill="var(--amber)" />
              <Bar dataKey="absent" name="Absent" stackId="a" fill="var(--red)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="heatmap-legend">
            <span><span className="dot green" />Present</span>
            <span><span className="dot amber" />Late</span>
            <span><span className="dot red" />Absent</span>
          </div>
        </div>

        {/* Per-course breakdown */}
        <div className="course-breakdown card animate-fadeUp">
          <h3 className="section-title" style={{ marginBottom: 14 }}>Per Course Breakdown</h3>
          {courseBreakdown.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No course data yet</p>
          ) : (
            <div className="breakdown-list">
              {courseBreakdown.map((c, i) => (
                <div key={i} className="breakdown-row">
                  <div className="breakdown-left">
                    <span className="breakdown-code">{c.courseCode}</span>
                    <span className="breakdown-name">{c.courseName}</span>
                  </div>
                  <div className="breakdown-bar-wrap">
                    <div className="breakdown-bar">
                      <div className="bar-fill" style={{ width: `${c.attendanceRate}%`, background: c.attendanceRate >= 75 ? "var(--green)" : "var(--red)" }} />
                    </div>
                    <span className={`breakdown-pct ${c.attendanceRate < 75 ? "red" : ""}`}>{c.attendanceRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
