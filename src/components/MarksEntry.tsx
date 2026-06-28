// ... existing imports

export default function MarksEntry({ learners, marks, config, onRefresh, onAlert }: MarksEntryProps) {
  // ... existing state and logic

  return (
    <div className="space-y-6">
      {/* Search and Tab Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <input 
          type="text" 
          placeholder="Search learner..." 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="bg-navy-800 border border-navy-700 text-white p-2 rounded-lg w-full sm:w-64" 
        />
        <div className="flex bg-navy-800 p-1 rounded-lg">
          {assessments.map(a => (
            <button 
              key={a.id} 
              onClick={() => setActiveAssessmentId(a.id)} 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeAssessmentId === a.id ? "bg-navy-600 text-white" : "text-navy-100 hover:bg-navy-700"}`}
            >
              {a.name}
            </button>
          ))}
          <button 
            onClick={() => setActiveAssessmentId("terminal")} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeAssessmentId === "terminal" ? "bg-navy-600 text-white" : "text-navy-100 hover:bg-navy-700"}`}
          >
            Terminal
          </button>
        </div>
      </div>

      {/* Modern Styled Table */}
      <div className="marks-table-wrapper">
        <table className="marks-table">
          <thead>
            <tr>
              <th className="text-left pl-4">Name</th>
              {SUBJECTS.map(s => <th key={s.code} className="text-center">{s.code}</th>)}
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {learners.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (
              <tr key={l.id}>
                <td className="pl-4 font-medium text-white">{l.name}</td>
                {SUBJECTS.map(sub => (
                  <td key={sub.code} className="text-center">
                    <input 
                      disabled={activeAssessmentId === "terminal"} 
                      value={localMarks[l.id]?.[sub.code] || ""} 
                      onChange={(e) => { 
                        setLocalMarks(prev => ({ ...prev, [l.id]: { ...prev[l.id], [sub.code]: e.target.value } })); 
                        setHasUnsavedChanges(true); 
                      }} 
                      className="marks-input" 
                    />
                  </td>
                ))}
                <td className="text-center">
                  <button 
                    disabled={activeAssessmentId === "terminal" || savingId === l.id} 
                    onClick={() => handleSaveRow(l.id)}
                    className="text-navy-100 hover:text-white transition-colors"
                  >
                    {savingId === l.id ? "Saving..." : <Save size={18} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
