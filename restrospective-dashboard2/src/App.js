import './index.css';
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ScatterChart, Scatter, ZAxis, AreaChart, Area, Cell, ComposedChart, Line
} from 'recharts';
import { 
  Brain, Zap, Clock, TrendingUp, Users, Target, 
  Layout, ChevronRight, BarChart3, PieChart, Upload, AlertCircle, X, Loader2
} from 'lucide-react';

const COLORS = ['#2563EB', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#06B6D4', '#8B5CF6', '#F43F5E'];

const App = () => {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isLibLoaded, setIsLibLoaded] = useState(false);

  // Load XLSX library via CDN to avoid resolution errors
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setIsLibLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // --- File Parsing Logic ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file) => {
    if (!isLibLoaded) {
      setError("Library is still loading. Please try again in a second.");
      return;
    }
    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        // Access XLSX from global window object
        const XLSX = window.XLSX;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length === 0) {
          throw new Error("The uploaded file is empty.");
        }

        // Normalize Keys to match our logic
        const normalizedData = rawJson.map(row => ({
          epic: row['Epic Link'] || row['Epic'] || row['epic'] || 'N/A',
          jira: row['JIRA No'] || row['Issue key'] || row['jira'] || 'N/A',
          module: row['Module'] || row['Component'] || row['module'] || 'General',
          assignee: row['Assignee'] || row['assignee'] || 'Unassigned',
          points: parseFloat(row['Story Points'] || row['Points'] || row['points'] || 0),
          release: row['Release Name'] || row['Fix Version'] || row['release'] || 'Unknown',
          sprintCount: parseInt(row['Sprint Count'] || row['Sprints'] || 0)
        }));

        setData(normalizedData);
      } catch (err) {
        setError("Failed to parse file. Ensure it is a valid Excel or CSV with appropriate columns.");
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const resetData = () => {
    setData([]);
    setFileName("");
    setError(null);
  };

  // --- Data Processing Hooks ---
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const totalPoints = data.reduce((acc, curr) => acc + curr.points, 0);
    const avgComplexity = (totalPoints / data.length).toFixed(1);
    const totalSprints = [...new Set(data.map(d => `${d.release}-${d.sprintCount}`))].length;
    return { totalPoints, totalJiras: data.length, avgComplexity, totalSprints };
  }, [data]);

  const velocityData = useMemo(() => {
    if (data.length === 0) return [];
    const releases = [...new Set(data.map(d => d.release))].sort();
    return releases.map(r => ({
      release: r,
      points: data.filter(d => d.release === r).reduce((s, d) => s + d.points, 0),
      count: data.filter(d => d.release === r).length
    }));
  }, [data]);

  const cumulativeData = useMemo(() => {
    let runningTotal = 0;
    return velocityData.map(v => {
      runningTotal += v.points;
      return { ...v, total: runningTotal };
    });
  }, [velocityData]);

  const radarData = useMemo(() => {
    if (data.length === 0) return [];
    const modules = [...new Set(data.map(d => d.module))];
    const assignees = [...new Set(data.map(d => d.assignee))];
    return modules.map(m => {
      const entry = { subject: m };
      assignees.forEach(a => {
        entry[a] = data.filter(d => d.module === m && d.assignee === a)
                        .reduce((s, d) => s + d.points, 0);
      });
      return entry;
    });
  }, [data]);

  const efficiencyData = useMemo(() => {
    return data.map((d, i) => ({
      name: d.jira,
      sprints: d.sprintCount,
      points: d.points,
      module: d.module,
      id: i
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <div className="text-center mb-10">
            <div className="inline-block p-4 bg-indigo-600 rounded-3xl text-white mb-6 shadow-xl shadow-indigo-200">
              <Brain size={48} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-4">Agile Insight Engine</h1>
            <p className="text-slate-500 text-lg">Upload your Jira Release Export (Excel/CSV) to generate deep retrospective analytics.</p>
          </div>

          {!isLibLoaded ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
              <p className="text-slate-600 font-medium">Initializing Analysis Engine...</p>
            </div>
          ) : (
            <label className="group relative block bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all">
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              <Upload className="mx-auto text-slate-400 group-hover:text-indigo-600 mb-4 transition-colors" size={40} />
              <span className="block text-xl font-bold text-slate-700">Drop file here or click to browse</span>
              <span className="block text-slate-400 text-sm mt-2">Supports .xlsx, .xls, and .csv</span>
            </label>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div className="p-4"><div className="text-slate-900 font-bold">1. Export</div><div className="text-xs text-slate-400">Jira Release Report</div></div>
            <div className="p-4"><div className="text-slate-900 font-bold">2. Upload</div><div className="text-xs text-slate-400">Excel or CSV file</div></div>
            <div className="p-4"><div className="text-slate-900 font-bold">3. Analyze</div><div className="text-xs text-slate-400">Automated Insights</div></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Brain size={14} /> Analytics Live
            </div>
            <button 
              onClick={resetData}
              className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <X size={14} /> Clear Data
            </button>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <span className="text-indigo-600 italic">"{fileName}"</span> Analysis
          </h1>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button 
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BarChart3 size={16} /> Velocity
          </button>
          <button 
            onClick={() => setActiveTab('deep')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'deep' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PieChart size={16} /> Deep Dive
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Points', value: stats.totalPoints, icon: <Zap />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Tickets Done', value: stats.totalJiras, icon: <Target />, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Avg Complexity', value: stats.avgComplexity, icon: <Layout />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Release Cycles', value: velocityData.length, icon: <Clock />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className={`p-2 w-fit rounded-lg ${kpi.bg} ${kpi.color} mb-3`}>{kpi.icon}</div>
              <div className="text-2xl font-black">{kpi.value}</div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-tighter">{kpi.label}</div>
            </div>
          ))}
        </div>

        {activeTab === 'summary' ? (
          <div className="space-y-6">
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Release Velocity</h2>
                  <p className="text-slate-500 text-sm italic">Aggregate effort vs volume per release cycle.</p>
                </div>
                <div className="flex gap-4 text-xs font-bold">
                   <span className="flex items-center gap-1 text-blue-600"><div className="w-3 h-3 bg-blue-600 rounded-full" /> Story Points</span>
                   <span className="flex items-center gap-1 text-amber-500"><div className="w-3 h-3 bg-amber-500 rounded-sm" /> Ticket Count</span>
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="release" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar yAxisId="right" dataKey="count" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={45} />
                    <Line yAxisId="left" type="monotone" dataKey="points" stroke="#2563EB" strokeWidth={4} dot={{ r: 6, fill: '#2563EB' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Burn-Up Trajectory</h3>
                 <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={cumulativeData}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Tooltip />
                          <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} fill="url(#colorTotal)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col justify-center">
                 <h3 className="text-indigo-400 uppercase text-xs font-black tracking-widest mb-4">Live Insights</h3>
                 <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <ChevronRight className="text-indigo-400 mt-1" size={16} />
                      <p className="text-sm text-slate-300">Found <strong>{velocityData.length}</strong> unique release cycles in the uploaded data.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <ChevronRight className="text-indigo-400 mt-1" size={16} />
                      <p className="text-sm text-slate-300">Total throughput measured at <strong>{stats.totalJiras}</strong> tickets with an average complexity of <strong>{stats.avgComplexity}</strong>.</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-indigo-700">Knowledge Radar</h2>
                <p className="text-slate-500 text-sm">Points per module across the team.</p>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                    {[...new Set(data.map(d => d.assignee))].map((name, i) => (
                      <Radar key={name} name={name} dataKey={name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} />
                    ))}
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-amber-600">Efficiency Scatter</h2>
                <p className="text-slate-500 text-sm">Comparing time spent (Sprints) vs Value (Points).</p>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="sprints" name="Sprints" unit=" s" />
                    <YAxis type="number" dataKey="points" name="Points" unit=" pts" />
                    <ZAxis type="number" range={[100, 400]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Tickets" data={efficiencyData}>
                      {efficiencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;