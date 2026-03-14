import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { FiClock, FiFolder, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'sonner';
import { ProjectData, useProjectStorage } from '../lib/useProjectStorage';

interface ProjectToolbarProps {
  calculatorKey: string;
  calculatorName: string;
  getFormData: () => Record<string, any>;
  onLoad: (formData: Record<string, any>) => void;
  projectInfo?: { projectName?: string; reference?: string };
}

export default function ProjectToolbar({
  calculatorKey,
  calculatorName,
  getFormData,
  onLoad,
  projectInfo,
}: ProjectToolbarProps) {
  const { saveProject, listProjects, loadProject, deleteProject } = useProjectStorage(calculatorKey);
  const [showPanel, setShowPanel] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);

  const handleSave = () => {
    const formData = getFormData();
    const name = projectInfo?.projectName || `${calculatorName} — ${new Date().toLocaleDateString()}`;
    saveProject(name, formData, projectInfo);
    toast.success('Project saved', { description: name });
  };

  const handleOpen = () => {
    setProjects(listProjects());
    setShowPanel(true);
  };

  const handleLoad = (id: string) => {
    const project = loadProject(id);
    if (project) {
      onLoad(project.formData);
      setShowPanel(false);
      toast.success('Project loaded', { description: project.name });
    }
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    setProjects(listProjects());
    toast('Project deleted');
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all"
          title="Save project"
          aria-label="Save project"
        >
          <FiSave className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
          title="Load saved project"
          aria-label="Load saved project"
        >
          <FiFolder className="w-3.5 h-3.5" />
          Load
        </button>
      </div>

      {/* Load Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white">Saved Projects</h3>
                <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-white" aria-label="Close">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                {projects.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No saved projects for this calculator.</p>
                ) : (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-blue-500/50 transition-colors group"
                    >
                      <button onClick={() => handleLoad(p.id)} className="flex-1 text-left">
                        <p className="text-white font-medium text-sm">{p.name}</p>
                        <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                          <FiClock className="w-3 h-3" />
                          {new Date(p.savedAt).toLocaleString()}
                        </p>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete"
                        aria-label={`Delete project ${p.name}`}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
