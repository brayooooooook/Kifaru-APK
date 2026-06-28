/**  
@license  
SPDX-License-Identifier: Apache-2.0  
*/  
  
// ... (imports remain unchanged)  
  
export default function Dashboard({  
  learners,  
  marks,  
  remarks,  
  setActiveTab,  
  config  
}: DashboardProps) {  
  
  const {  
    topLearner,  
    classMean,  
    highestScore,  
    lowestScore,  
    reportsGeneratedCount  
  } = useDashboardStatistics(learners, marks, remarks, config);  
  
  const logs = useMemo(() => { /* ... (existing logic) */ }, [remarks, marks]);  
  
  return (  
    <div className="space-y-8 bg-[#F8FAFC] text-black min-h-screen p-6">  
      {/* Dashboard Header */}  
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-6 gap-4">  
        <div>  
          <h2 className="text-4xl font-display font-bold tracking-tight text-[#1B365D]">Dashboard</h2>  
          <p className="text-sm text-gray-600 mt-1">  
            Welcome, <strong>{config.classTeacher?.split(" ")[0] ?? "Teacher"}</strong><br />  
            {config.className ?? "Grade 8 Blue"} • {config.schoolName ?? "Muchorwe Junior School"}  
          </p>  
        </div>  
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-mono font-bold text-[#1B365D] shadow-sm">  
          <Clock className="h-4 w-4 text-[#1B365D]" />  
          <span>System Online</span>  
        </div>  
      </div>  
  
      {/* Summary Cards */}      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">      
        {/* ... (Total Learners, Total Subjects same as before) ... */}  
        {/* Statistics Card (Updated for Mean) */}  
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">  
           <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Mean</span>  
           <span className="block text-3xl font-display font-bold text-gray-950 mt-1.5">{classMean.toFixed(1)}</span>  
           <span className="text-[11px] font-medium text-gray-500">Aggregate Points</span>  
        </div>  
        {/* ... (Report Cards same as before) ... */}  
      </div>      
  
      {/* Details Row */}      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">      
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">      
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">      
            <div className="p-3 bg-[#F0F4F8] text-[#1B365D] rounded-2xl"><Trophy className="h-5 w-5" /></div>      
            <div>      
              <h4 className="text-sm font-bold text-[#1B365D]">Class Champion</h4>      
              <p className="text-xs text-gray-500">Highest aggregate marks</p>      
            </div>      
          </div>      
          <div className="space-y-3">      
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Learner Details</span>      
            <span className="block text-base font-semibold text-gray-950">{topLearner.name}</span>      
            <span className="block text-xs text-gray-500 -mt-2">Adm No: {topLearner.admissionNumber ?? "N/A"}</span>      
            <div className="grid grid-cols-2 gap-4">      
              <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total</span><span className="text-lg font-bold text-[#1B365D] font-mono">{topLearner.total}</span></div>      
              <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Rank</span><span className="text-lg font-bold text-gray-950">#{topLearner.position}</span></div>      
            </div>      
          </div>      
        </div>      
  
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">      
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">      
              <div className="p-3 bg-[#F0F4F8] text-[#1B365D] rounded-2xl"><Award className="h-5 w-5" /></div>      
              <div><h4 className="text-sm font-bold text-[#1B365D]">Score Snapshot</h4></div>      
            </div>      
            <div className="space-y-3">  
                {[  
                    { label: "Highest", value: highestScore },  
                    { label: "Class Mean", value: classMean.toFixed(1) },  
                    { label: "Lowest", value: lowestScore }  
                ].map((stat, i) => (  
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">  
                        <span className="text-xs font-medium text-gray-500">{stat.label}</span>  
                        <span className="font-mono font-bold text-gray-950">{stat.value}</span>  
                    </div>  
                ))}  
            </div>  
        </div>  
          
        {/* ... (School info card same as before) ... */}  
      </div>      
  
      {/* Quick Actions (Updated with primary button) */}      
      <div className="space-y-4">      
        <h3 className="text-lg font-display font-bold text-[#1B365D]">Quick Actions Shortcut Hub</h3>      
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">      
          <button   
            aria-label="Enter Marks"   
            onClick={() => setActiveTab("marks")}   
            className="p-4 bg-[#1B365D] text-white hover:bg-[#152A4A] transition-all text-center rounded-2xl flex flex-col items-center gap-2"  
          >      
            <div className="p-3 bg-white/10 rounded-2xl"><Plus className="h-5 w-5" /></div>      
            <span className="text-xs font-bold">Enter Marks</span>      
          </button>  
            
          {[/* ... (Others with white backgrounds) ... */].map((action, i) => (  
             // ... standard white button mapping ...  
          ))}  
        </div>      
      </div>      
  
      {/* Activity Trail (Placeholder added) */}      
      <div className="space-y-4">      
        <h3 className="text-lg font-display font-bold text-[#1B365D]">Recent Operations Activity Trail</h3>      
        {logs.length > 0 ? (  
            <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">      
                {logs.map((log) => (/* ... */))}  
            </div>  
        ) : (  
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">  
                No recent activity recorded. Activity will appear after using the system.  
            </div>  
        )}  
      </div>      
    </div>  
  );  
}  
  
