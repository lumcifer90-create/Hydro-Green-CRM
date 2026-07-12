import React, { useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, CheckCircle, Play, 
  Clock, MapPin, ChevronRight, AlertCircle, Info, Star,
  MessageSquare, Mail, Phone, AlertTriangle, Sliders, Calendar, TrendingUp, Gauge
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { Project, Customer, ProjectStage } from '../types';
import { generateMilestoneEmail, generateReminderEmail } from '../utils/emailTemplates';

interface ProjectWorkflowProps {
  projects: Project[];
  customers: Customer[];
  darkMode: boolean;
  onRefresh: () => void;
}

const STAGES_LIST = [
  "Lead", "Documentation", "Quotation", "Estimate", "Bank Application", "Sanction Letter",
  "GOC Application", "GOC Approval", "Material Dispatch", "Site Survey", "Engineering Design",
  "Civil Foundation", "Structure Installation", "Plastic Installation", "Irrigation Setup",
  "Automation", "Quality Check", "Project Handover", "Subsidy Documentation", "Completed"
];

const STAGE_WEEKS_MAP: { [key: string]: { start: number; end: number } } = {
  "Lead": { start: 1, end: 1 },
  "Documentation": { start: 1, end: 1 },
  "Quotation": { start: 1, end: 2 },
  "Estimate": { start: 2, end: 2 },
  "Bank Application": { start: 2, end: 3 },
  "Sanction Letter": { start: 3, end: 3 },
  "GOC Application": { start: 3, end: 4 },
  "GOC Approval": { start: 4, end: 4 },
  "Material Dispatch": { start: 4, end: 5 },
  "Site Survey": { start: 5, end: 5 },
  "Engineering Design": { start: 5, end: 5 },
  "Civil Foundation": { start: 5, end: 6 },
  "Structure Installation": { start: 6, end: 7 },
  "Plastic Installation": { start: 7, end: 8 },
  "Irrigation Setup": { start: 8, end: 8 },
  "Automation": { start: 8, end: 9 },
  "Quality Check": { start: 9, end: 9 },
  "Project Handover": { start: 9, end: 10 },
  "Subsidy Documentation": { start: 10, end: 10 },
  "Completed": { start: 10, end: 10 }
};

export default function ProjectWorkflow({
  projects,
  customers,
  darkMode,
  onRefresh
}: ProjectWorkflowProps) {
  const savedUserStr = localStorage.getItem('hydrogreen_user');
  const userRole = savedUserStr ? JSON.parse(savedUserStr).role : 'employee';
  const isAdmin = userRole === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Gantt Timeline & Bottleneck Tracking views
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [mainViewMode, setMainViewMode] = useState<'table' | 'portfolio'>('table');
  const [bottleneckThresholdDays, setBottleneckThresholdDays] = useState<number>(10);

  // Selected project for detailed timeline management
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Message Update modal state for project
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [msgTemplate, setMsgTemplate] = useState('stage_update');
  const [msgContent, setMsgContent] = useState('');
  const [msgTargetCustomer, setMsgTargetCustomer] = useState<Customer | null>(null);
  const [msgTargetProject, setMsgTargetProject] = useState<Project | null>(null);
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string>('');

  // New Email state variables
  const [emailSubject, setEmailSubject] = useState('');
  const [emailTextBody, setEmailTextBody] = useState('');
  const [emailHtmlBody, setEmailHtmlBody] = useState('');
  const [actionRequiredInput, setActionRequiredInput] = useState('Completing the primary bank sanction documentation');
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Forms state
  const [id, setId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [areaCovered, setAreaCovered] = useState(0);

  // Individual stage edit helper
  const [editingStageName, setEditingStageName] = useState<string | null>(null);
  const [stageStatus, setStageStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');
  const [stageDate, setStageDate] = useState('');
  const [stageRemarks, setStageRemarks] = useState('');
  const [stagePercentage, setStagePercentage] = useState(0);

  const currentProject = projects.find(p => p.id === selectedProjectId);

  const resetForm = () => {
    setId('');
    setCustomerId('');
    setProjectName('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setTotalValue(0);
    setAreaCovered(0);
  };

  const regenerateAndSetMessage = (
    template: string,
    cust: Customer,
    proj: Project,
    stage: string,
    reminderAction: string
  ) => {
    const stagesArr = STAGES_LIST;
    const stageIdx = stagesArr.indexOf(stage);
    let stageProgressPercent = 0;
    if (stageIdx !== -1) {
      stageProgressPercent = Math.round(((stageIdx + 1) / STAGES_LIST.length) * 100);
    } else {
      stageProgressPercent = calculateOverallPercentage(proj);
    }

    let text = '';

    if (template === 'email_milestone') {
      const mailResult = generateMilestoneEmail({
        customerName: cust.name,
        projectName: proj.projectName,
        currentStage: stage,
        progressPercent: stageProgressPercent,
        location: cust.district || cust.address || 'Sikar'
      });
      setEmailSubject(mailResult.subject);
      setEmailTextBody(mailResult.textBody);
      setEmailHtmlBody(mailResult.htmlBody);
      setCopiedHtml(false);
      text = mailResult.textBody;
    } else if (template === 'email_reminder') {
      const mailResult = generateReminderEmail({
        customerName: cust.name,
        projectName: proj.projectName,
        pendingStage: stage,
        location: cust.district || cust.address || 'Sikar',
        actionRequired: reminderAction
      });
      setEmailSubject(mailResult.subject);
      setEmailTextBody(mailResult.textBody);
      setEmailHtmlBody(mailResult.htmlBody);
      setCopiedHtml(false);
      text = mailResult.textBody;
    } else if (template === 'stage_update') {
      text = `*Project Update: ${proj.projectName}*

Dear Mr./Ms. ${cust.name},

We are pleased to share a key milestone update regarding your *${proj.projectName}* setup.

Under the expert supervision of our engineering division, we have successfully initiated and transitioned your project to the *${stage}* phase.

*Current Phase:* ${stage}
*Overall Project Progress:* ${stageProgressPercent}%

Our on-site crews are maintaining excellent momentum to deliver your premier-quality agricultural structure on schedule.

Thank you for partnering with HydroGreen Energy Pvt Ltd. We will continue to keep you updated as we progress.

Warm regards,

*HydroGreen Energy Pvt Ltd*
_Premier Agricultural Solutions_`;
    } else if (template === 'welcome') {
      text = `*Project Commencement & Kickoff Greetings*

Dear Mr./Ms. ${cust.name},

Welcome to HydroGreen Energy! We are absolutely thrilled to commence the on-site execution of your premier *${proj.projectName}* project.

*Current Initializing Phase:* ${stage}
*Registered Client Site:* ${cust.village || ''}, ${cust.district || 'Sikar'}, ${cust.state || ''}

Our dispatch logistics and civil design blueprints are finalized, and your dedicated Project Manager is establishing on-site layout benchmarks. We are committed to rendering top-tier professional agricultural infrastructure for your operations.

Thank you for choosing HydroGreen Energy Pvt Ltd. We look forward to a successful execution.

Warm regards,

*HydroGreen Energy Pvt Ltd*
_Premier Agricultural Solutions_`;
    } else if (template === 'material') {
      text = `*Material Dispatch & Construction Setup*

Dear Mr./Ms. ${cust.name},

We are pleased to notify you that the custom-engineered fabrication materials and micro-irrigation components for your *${proj.projectName}* project have been dispatched from our central hub.

*Logistics Phase:* ${stage}
*Delivery Site Address:* ${cust.address || cust.village || 'Site Location'}

Our on-site assembly technicians will arrive within 24-48 hours of shipment delivery to coordinate unloading and begin structural layout setup. Please ensure the designated civil workspace is cleared for inventory positioning.

Thank you for your cooperation!

Warm regards,

*HydroGreen Energy Pvt Ltd*
_Premier Agricultural Solutions_`;
    } else if (template === 'milestone') {
      text = `*Key Milestone Achieved: ${stage}*

Dear Mr./Ms. ${cust.name},

We are delighted to report the successful completion of a crucial milestone for your *${proj.projectName}* project!

*Completed Milestone Phase:* ${stage}
*Overall Project Progress:* ${stageProgressPercent}%

All quality checks and structural tolerances for this phase have been verified by our Quality Assurance Inspectors. We are now preparing to transition directly into the next phase of construction.

Thank you for partnering with HydroGreen. We look forward to delivering your premium facility.

Warm regards,

*HydroGreen Energy Pvt Ltd*
_Premier Agricultural Solutions_`;
    } else if (template === 'handover') {
      text = `*Project Handover & Quality Audit Notice*

Dear Mr./Ms. ${cust.name},

We are pleased to update you that your HydroGreen project *${proj.projectName}* has successfully reached the final stages of completion!

*Current Phase:* ${stage} (Quality Auditing & Commissioning)
*Overall Progress:* ${stageProgressPercent}%

Our Engineering Inspectors are conducting complete pressure tests, climate controller calibrations, and joint integrity audits. We look forward to scheduling the final walkthrough and handing over the keys to your brand-new, premier facility.

Thank you for choosing HydroGreen Energy Pvt Ltd.

Warm regards,

*HydroGreen Energy Pvt Ltd*
_Premier Agricultural Solutions_`;
    } else {
      text = '';
    }

    setMsgContent(text);
  };

  const handleOpenAdd = () => {
    resetForm();
    setId('PROJ-' + Math.floor(1000 + Math.random() * 9000));
    if (customers.length > 0) {
      setCustomerId(customers[0].id);
    }
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !customerId) return;

    const selectedCust = customers.find(c => c.id === customerId);
    if (!selectedCust) return;

    // Build the initial 20 stages object with 'Pending'
    const initialStages: { [key: string]: ProjectStage } = {};
    STAGES_LIST.forEach((stage, idx) => {
      initialStages[stage] = {
        name: stage,
        status: idx === 0 ? 'Completed' : idx === 1 ? 'In Progress' : 'Pending',
        date: idx === 0 ? new Date().toISOString().split('T')[0] : undefined,
        remarks: idx === 0 ? 'Project created from won lead' : undefined,
        percentage: idx === 0 ? 100 : idx === 1 ? 20 : 0
      };
    });

    try {
      const newProject: Project = {
        id,
        customerId,
        customerName: selectedCust.name,
        projectName,
        currentStage: "Documentation",
        stages: initialStages,
        startDate,
        totalValue: Number(totalValue) || selectedCust.projectValue || 0,
        areaCovered: Number(areaCovered) || 0,
        createdAt: new Date().toISOString().split('T')[0]
      };

      await setDoc(doc(db, 'projects', id), cleanUndefined(newProject));
      
      // Update customer status to Active
      await updateDoc(doc(db, 'customers', customerId), {
        status: 'Active'
      });

      setIsAddOpen(false);
      resetForm();
      onRefresh();
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  const handleDelete = async (projId: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteDoc(doc(db, 'projects', projId));
      if (selectedProjectId === projId) {
        setSelectedProjectId(null);
      }
      onRefresh();
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  // Computes overall project completion percentage based on the 20 stages
  const calculateOverallPercentage = (proj: Project) => {
    const stagesArr = Object.values(proj.stages || {});
    if (stagesArr.length === 0) return 0;
    const completedCount = stagesArr.filter(s => s.status === 'Completed').length;
    const inProgressCount = stagesArr.filter(s => s.status === 'In Progress').length;
    const totalCount = STAGES_LIST.length;
    return Math.round(((completedCount * 100) + (inProgressCount * 50)) / totalCount);
  };

  // Identifies if an execution phase is stalling or delayed
  const getStageBottleneckStatus = (stageName: string, stage: ProjectStage, project: Project) => {
    if (stage.status === 'Completed') return { status: 'Normal', message: 'Stage completed on time' };

    const isHighRiskStage = [
      "Bank Application", "Sanction Letter", "Civil Foundation", 
      "Material Dispatch", "Subsidy Documentation"
    ].includes(stageName);

    if (stage.status === 'In Progress') {
      if (stage.date) {
        const targetDate = new Date(stage.date);
        const today = new Date();
        if (today > targetDate) {
          const diffTime = Math.abs(today.getTime() - targetDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > bottleneckThresholdDays) {
            return { 
              status: 'Critical', 
              message: `Delayed by ${diffDays} days past stated target date!`,
              isHighRiskStage
            };
          }
          return {
            status: 'Warning',
            message: `Target date passed ${diffDays} days ago.`,
            isHighRiskStage
          };
        }
      }

      // Check project timeline age
      if (project.startDate) {
        const start = new Date(project.startDate);
        const today = new Date();
        const elapsedDays = Math.ceil(Math.abs(today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const stageIndex = STAGES_LIST.indexOf(stageName);
        if (elapsedDays > 35 && stageIndex < 10) {
          return {
            status: 'Critical',
            message: `Lagging: Project is ${elapsedDays} days old but still stuck in early phase (${stageName}).`,
            isHighRiskStage
          };
        }
      }
    }

    return { status: 'Normal', message: 'Current step is stable', isHighRiskStage };
  };

  // Open editor for a specific stage
  const handleEditStage = (stageName: string, stage: ProjectStage) => {
    setEditingStageName(stageName);
    setStageStatus(stage.status);
    setStageDate(stage.date || new Date().toISOString().split('T')[0]);
    setStageRemarks(stage.remarks || '');
    setStagePercentage(stage.percentage || 0);
  };

  const handleSaveStageUpdate = async () => {
    if (!currentProject || !editingStageName) return;

    try {
      const updatedStages = { ...currentProject.stages };
      updatedStages[editingStageName] = {
        name: editingStageName,
        status: stageStatus,
        date: stageDate || undefined,
        remarks: stageRemarks || undefined,
        percentage: Number(stagePercentage)
      };

      // Determine the latest non-pending stage as the currentStage
      let latestActiveStage = currentProject.currentStage;
      let highestActiveIdx = -1;
      STAGES_LIST.forEach((stage, idx) => {
        const s = updatedStages[stage];
        if (s && (s.status === 'Completed' || s.status === 'In Progress')) {
          highestActiveIdx = idx;
        }
      });
      if (highestActiveIdx !== -1) {
        latestActiveStage = STAGES_LIST[highestActiveIdx];
      }

      const updatePayload: Partial<Project> = {
        stages: updatedStages,
        currentStage: latestActiveStage
      };

      if (latestActiveStage === 'Completed' && stageStatus === 'Completed') {
        updatePayload.endDate = new Date().toISOString().split('T')[0];
        // Also mark customer as completed
        await updateDoc(doc(db, 'customers', currentProject.customerId), {
          status: 'Completed'
        });
      }

      await updateDoc(doc(db, 'projects', currentProject.id), cleanUndefined(updatePayload));
      setEditingStageName(null);
      onRefresh();
    } catch (err) {
      console.error("Error saving stage update:", err);
    }
  };

  // Filter
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = filterStage ? p.currentStage === filterStage : true;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Detail Page Subview */}
      {selectedProjectId && currentProject ? (
        <div className="space-y-6 animate-fade-in">
          {/* Timeline header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedProjectId(null); setEditingStageName(null); }}
              className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              Back to Projects
            </button>
            <span className="text-slate-400 font-mono text-xs">/ {currentProject.id}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left overview */}
            <div className={`p-6 rounded-xl border space-y-6 h-fit ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div>
                <h2 className="text-lg font-bold">{currentProject.projectName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Client: {currentProject.customerName}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Project Completion</span>
                  <span>{calculateOverallPercentage(currentProject)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300" 
                    style={{ width: `${calculateOverallPercentage(currentProject)}%` }}
                  />
                </div>
              </div>

              {/* Client Contact Info */}
              {(() => {
                const projectCustomer = customers.find(c => c.id === currentProject.customerId);
                return (
                  <div className="pt-4 border-t dark:border-slate-800 border-slate-100 space-y-3">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Client Contact & Dispatch</p>
                    {projectCustomer ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{projectCustomer.phone}</span>
                        </div>
                        {projectCustomer.whatsapp && (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>WA: {projectCustomer.whatsapp}</span>
                          </div>
                        )}
                        {projectCustomer.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[180px]">{projectCustomer.email}</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setMsgTargetCustomer(projectCustomer);
                            setMsgTargetProject(currentProject);
                            setMsgTemplate('stage_update');
                            setSelectedPipelineStage(currentProject.currentStage);
                            regenerateAndSetMessage(
                              'stage_update',
                              projectCustomer,
                              currentProject,
                              currentProject.currentStage,
                              actionRequiredInput
                            );
                            setIsMsgModalOpen(true);
                          }}
                          className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Update & Message Client</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No detailed client contact records mapped.</p>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-4 text-xs pt-4 border-t dark:border-slate-800 border-slate-100">
                <div>
                  <p className="text-slate-400 font-medium">Current Stage</p>
                  <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">{currentProject.currentStage}</p>
                </div>
                {currentProject.startDate && (
                  <div>
                    <p className="text-slate-400 font-medium">Commencement Date</p>
                    <p className="font-semibold mt-0.5">{currentProject.startDate}</p>
                  </div>
                )}
                {currentProject.endDate && (
                  <div>
                    <p className="text-slate-400 font-medium">Handover Date</p>
                    <p className="font-semibold text-emerald-600 mt-0.5">{currentProject.endDate}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-[10px] uppercase font-mono">Valuation</p>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">₹{currentProject.totalValue?.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-[10px] uppercase font-mono">Area Covered</p>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{currentProject.areaCovered || 'N/A'} Ac</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side 20 stages workflow board */}
            <div className={`p-6 rounded-xl border lg:col-span-2 space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400">
                    20-Stage Pipeline Engine
                  </h3>
                  <span className="text-[10px] text-slate-400">Manage real-time execution phases, visual timelines & latent bottlenecks</span>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                      viewMode === 'list' 
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    Vertical List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('gantt')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                      viewMode === 'gantt' 
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Interactive Gantt Chart</span>
                  </button>
                </div>
              </div>

              {viewMode === 'list' ? (
                /* Stages Timeline stack - List View */
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                  {STAGES_LIST.map((stageName, index) => {
                    const stage = currentProject.stages?.[stageName] || { name: stageName, status: 'Pending', percentage: 0 };
                    const isCurrentEditing = editingStageName === stageName;

                    return (
                      <div key={stageName} className="border dark:border-slate-800 border-slate-100 rounded-lg overflow-hidden transition-all">
                        {/* Stage Banner Row */}
                        <div 
                          onClick={() => handleEditStage(stageName, stage)}
                          className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                            stage.status === 'Completed' ? 'bg-emerald-500/5 hover:bg-emerald-500/10' :
                            stage.status === 'In Progress' ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-xs font-mono font-bold w-5 shrink-0">#{index + 1}</span>
                            <div className="shrink-0">
                              {stage.status === 'Completed' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                              {stage.status === 'In Progress' && <Play className="w-5 h-5 text-blue-500 animate-pulse" />}
                              {stage.status === 'Pending' && <Clock className="w-5 h-5 text-slate-300" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold">{stageName}</p>
                              {stage.remarks && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-[300px] italic">"{stage.remarks}"</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-auto">
                            {stage.date && <span className="text-[10px] text-slate-400">{stage.date}</span>}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              stage.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              stage.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {stage.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Stage editor form slide-down */}
                        {isCurrentEditing && (
                          <div className={`p-4 border-t dark:border-slate-800 border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50`}>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
                              <select
                                value={stageStatus}
                                onChange={(e) => setStageStatus(e.target.value as any)}
                                className={`w-full p-1.5 text-xs rounded border focus:outline-none ${
                                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Percentage Completeness</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={stagePercentage}
                                onChange={(e) => setStagePercentage(Number(e.target.value))}
                                className={`w-full p-1.5 text-xs rounded border focus:outline-none ${
                                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Target Date</label>
                              <input
                                type="date"
                                value={stageDate}
                                onChange={(e) => setStageDate(e.target.value)}
                                className={`w-full p-1.5 text-xs rounded border focus:outline-none ${
                                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Remarks & Status notes</label>
                              <input
                                type="text"
                                value={stageRemarks}
                                placeholder="Remarks..."
                                onChange={(e) => setStageRemarks(e.target.value)}
                                className={`w-full p-1.5 text-xs rounded border focus:outline-none ${
                                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                              />
                            </div>

                            <div className="sm:col-span-2 flex justify-end gap-1.5 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingStageName(null)}
                                className="px-2.5 py-1 text-xs font-semibold rounded border dark:border-slate-700"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveStageUpdate}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                              >
                                Apply Updates
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Interactive Gantt Chart View */
                <div className="space-y-6">
                  {/* Gantt Visual Grid */}
                  <div className="p-4 rounded-xl border dark:border-slate-800 border-slate-100 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">Horizontal Gantt Scheduler (W1 - W10)</span>
                      <span className="text-[9px] text-slate-400 italic">Click any row to select & slide-update</span>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[650px] space-y-1.5">
                        {/* Weekly Timeline Scale Header */}
                        <div className="grid grid-cols-12 gap-1 text-[9px] font-mono font-bold text-slate-400 text-center uppercase pb-1.5 border-b dark:border-slate-800 border-slate-200">
                          <div className="col-span-4 text-left">Execution Stage</div>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="col-span-1">W{i + 1}</div>
                          ))}
                        </div>

                        {/* Stage Rows */}
                        <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                          {STAGES_LIST.map((stageName, index) => {
                            const stage = currentProject.stages?.[stageName] || { name: stageName, status: 'Pending', percentage: 0 };
                            const weeks = STAGE_WEEKS_MAP[stageName] || { start: 1, end: 1 };
                            const isSelected = editingStageName === stageName;
                            const bottleneck = getStageBottleneckStatus(stageName, stage, currentProject);

                            return (
                              <div 
                                key={stageName}
                                onClick={() => handleEditStage(stageName, stage)}
                                className={`grid grid-cols-12 gap-1 items-center p-1.5 rounded cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'bg-amber-500/10 dark:bg-amber-500/5 ring-1 ring-amber-500/30' 
                                    : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
                                }`}
                              >
                                {/* Stage Title & Info */}
                                <div className="col-span-4 flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 font-mono w-4">#{index + 1}</span>
                                  <div className="truncate">
                                    <p className={`text-[11px] font-semibold truncate ${isSelected ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                      {stageName}
                                    </p>
                                    {bottleneck.status !== 'Normal' && (
                                      <span className="text-[8px] font-bold text-red-500 block truncate leading-none mt-0.5">
                                        ⚠️ {bottleneck.message}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 10 Weekly Gantt Cells */}
                                {Array.from({ length: 10 }).map((_, i) => {
                                  const weekNum = i + 1;
                                  const isWithinSpan = weekNum >= weeks.start && weekNum <= weeks.end;
                                  
                                  return (
                                    <div key={i} className="col-span-1 h-5 relative flex items-center justify-center">
                                      {/* Week Cell Gridline */}
                                      <div className="absolute inset-0 border-r border-dashed border-slate-200 dark:border-slate-800 last:border-r-0" />
                                      
                                      {isWithinSpan && (
                                        <div 
                                          className={`absolute inset-y-1 w-full rounded transition-all flex items-center justify-center overflow-hidden ${
                                            stage.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' :
                                            stage.status === 'In Progress' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30' :
                                            'bg-slate-200/40 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-300/30'
                                          }`}
                                          title={`${stageName}: ${stage.status} (${stage.percentage}%)`}
                                        >
                                          {/* Visual completion progress bar fill inside Gantt block */}
                                          {stage.status === 'In Progress' && (
                                            <div 
                                              className="absolute left-0 top-0 bottom-0 bg-blue-500/35 transition-all duration-300"
                                              style={{ width: `${stage.percentage}%` }}
                                            />
                                          )}
                                          {stage.status === 'Completed' && (
                                            <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/30 w-full" />
                                          )}
                                          
                                          {/* Micro state icon */}
                                          <span className="z-10 text-[9px] font-extrabold font-mono">
                                            {stage.status === 'Completed' ? '✓' : stage.percentage > 0 ? `${stage.percentage}%` : '•'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Gantt Controller Console */}
                  {editingStageName ? (
                    <div className="p-4 rounded-xl border border-amber-200/50 dark:border-amber-950/40 bg-amber-500/5 space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <div>
                            <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-300">Gantt Stage Controller</h4>
                            <p className="text-[10px] text-slate-400">Modifying stage: <span className="font-bold">{editingStageName}</span></p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setEditingStageName(null)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wide px-2 py-1 rounded hover:bg-slate-200/50"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Status Toggle buttons */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Badge</label>
                          <div className="grid grid-cols-3 gap-1">
                            {['Pending', 'In Progress', 'Completed'].map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => {
                                  setStageStatus(st as any);
                                  if (st === 'Completed') setStagePercentage(100);
                                  if (st === 'Pending') setStagePercentage(0);
                                }}
                                className={`py-1.5 px-1 rounded text-[10px] font-bold transition-all text-center ${
                                  stageStatus === st
                                    ? st === 'Completed' ? 'bg-emerald-600 text-white shadow-sm' :
                                      st === 'In Progress' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-700 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Visual Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Completeness</label>
                            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">{stagePercentage}%</span>
                          </div>
                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={stagePercentage}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setStagePercentage(val);
                                if (val === 100) setStageStatus('Completed');
                                else if (val > 0) setStageStatus('In Progress');
                                else setStageStatus('Pending');
                              }}
                              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
                            />
                          </div>
                        </div>

                        {/* Target Date */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Date</label>
                          <input
                            type="date"
                            value={stageDate}
                            onChange={(e) => setStageDate(e.target.value)}
                            className={`w-full p-1 text-xs rounded border focus:outline-none ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          />
                        </div>

                        {/* Status Remarks */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Log Remarks</label>
                          <input
                            type="text"
                            value={stageRemarks}
                            placeholder="Add execution note..."
                            onChange={(e) => setStageRemarks(e.target.value)}
                            className={`w-full p-1 text-xs rounded border focus:outline-none ${
                              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800/60 border-slate-200/60">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mr-auto">
                          ✓ Safe & non-destructive database updates
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingStageName(null)}
                          className="px-3 py-1.5 text-xs font-semibold rounded border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveStageUpdate}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow transition-all"
                        >
                          Sync Timeline Data
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed dark:border-slate-800 border-slate-200 text-center text-xs text-slate-400">
                      💡 Click any execution stage row in the Gantt grid above to load and live-slide its completion percentage.
                    </div>
                  )}

                  {/* Bottlenecks Remediation & Analysis Engine */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Stage Bottleneck Remediation & Critical Path Guide</span>
                    </h4>

                    {(() => {
                      // Filter stages with warnings or critical states
                      const bottleneckStages = STAGES_LIST.map((name) => {
                        const stage = currentProject.stages?.[name] || { name, status: 'Pending', percentage: 0 };
                        const analysis = getStageBottleneckStatus(name, stage, currentProject);
                        return { name, stage, analysis };
                      }).filter(item => item.analysis.status !== 'Normal');

                      if (bottleneckStages.length === 0) {
                        return (
                          <div className="p-3.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 text-[11px] text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>Excellent! All 20 execution stages are currently within standard latency limits. No bottlenecks detected.</span>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {bottleneckStages.map(({ name, stage, analysis }) => {
                            // High risk horticultural advice
                            let advice = "Track delays, verify with supervisors, and log corrective notes.";
                            if (name === "Bank Application") advice = "Actionable Tip: NHB subsidy projects require clean structural drawings and Land ownership documents. Send a formatted email update requesting document clarification.";
                            if (name === "Civil Foundation") advice = "Actionable Tip: foundation blocks require 10 days of water curing before erecting the steel trusses. Ensure water supply and civil labor availability.";
                            if (name === "Material Dispatch") advice = "Actionable Tip: Verify if structural columns and top profile polyhouse sheets are loaded together to avoid dual transport charges.";
                            if (name === "Subsidy Documentation") advice = "Actionable Tip: Prepare the Joint inspection report, bills of materials, and GPS photographs to clear file at the NHB state desk.";

                            return (
                              <div key={name} className="p-3 rounded-lg border border-red-500/10 bg-red-500/5 dark:bg-red-950/10 space-y-1 text-[11px]">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-red-700 dark:text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{name} ({stage.status})</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                    {analysis.status}
                                  </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300">{analysis.message}</p>
                                <p className="text-slate-400 dark:text-slate-500 text-[10px] italic leading-relaxed pt-0.5 border-t border-red-200/20 mt-1">{advice}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Project Stage Manager</h2>
              <p className="text-xs text-slate-400 mt-1">
                Monitor business projects, track the 20-stage industrial pipeline, and execute deliverables
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMainViewMode('table')}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all ${
                    mainViewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  Table View
                </button>
                <button
                  type="button"
                  onClick={() => setMainViewMode('portfolio')}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                    mainViewMode === 'portfolio'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Roadmap Portfolio</span>
                </button>
              </div>

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/15 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Start New Project
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-lg border dark:border-slate-800 border-slate-100">
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by project title, client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded border focus:outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}
              />
            </div>

            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className={`text-xs px-3 py-2 rounded border focus:outline-none ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <option value="">All Current Stages</option>
              {STAGES_LIST.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <div className="text-right flex items-center justify-end text-xs text-slate-400 px-1 font-mono">
              Filtered: {filteredProjects.length} of {projects.length}
            </div>
          </div>

          {/* Projects Table */}
          {filteredProjects.length > 0 ? (
            mainViewMode === 'table' ? (
              <div className="border dark:border-slate-800 border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                    <tr>
                      <th className="p-4 font-semibold">Project ID</th>
                      <th className="p-4 font-semibold">Project Title</th>
                      <th className="p-4 font-semibold">Client Relation</th>
                      <th className="p-4 font-semibold">Execution Completion</th>
                      <th className="p-4 font-semibold">Active Stage</th>
                      <th className="p-4 font-semibold">Valuation & Area</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
                    {filteredProjects.map((p) => {
                      const overallPercentage = calculateOverallPercentage(p);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-4 font-mono text-[11px] text-slate-400">{p.id}</td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelectedProjectId(p.id)}
                              className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-left text-xs leading-tight"
                            >
                              {p.projectName}
                            </button>
                          </td>
                          <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                            <div>
                              <p>{p.customerName}</p>
                              {(() => {
                                const rowCust = customers.find(c => c.id === p.customerId);
                                if (!rowCust) return null;
                                return (
                                  <div className="flex flex-col gap-0.5 mt-1 text-[10px] font-normal text-slate-400">
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" /> {rowCust.phone}
                                    </span>
                                    {rowCust.whatsapp && (
                                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                                        WA: {rowCust.whatsapp}
                                      </span>
                                    )}
                                    {rowCust.email && (
                                      <span className="flex items-center gap-1 text-slate-450 truncate max-w-[130px]" title={rowCust.email}>
                                        <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{rowCust.email}</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 max-w-[140px]">
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className="bg-emerald-600 h-full rounded-full" 
                                  style={{ width: `${overallPercentage}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-semibold">{overallPercentage}%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold text-[10px]">
                              {p.currentStage}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="font-bold">₹{p.totalValue?.toLocaleString('en-IN')}</p>
                            <p className="text-[10px] text-slate-400">{p.areaCovered || 'N/A'} Acres Covered</p>
                          </td>
                          <td className="p-4 text-right flex items-center justify-end gap-1.5">
                            {(() => {
                              const rowCust = customers.find(c => c.id === p.customerId);
                              if (!rowCust) return null;
                              return (
                                <button
                                  onClick={() => {
                                    setMsgTargetCustomer(rowCust);
                                    setMsgTargetProject(p);
                                    setMsgTemplate('stage_update');
                                    setSelectedPipelineStage(p.currentStage);
                                    regenerateAndSetMessage(
                                      'stage_update',
                                      rowCust,
                                      p,
                                      p.currentStage,
                                      actionRequiredInput
                                    );
                                    setIsMsgModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 font-bold rounded text-[10px] flex items-center gap-1 transition-all"
                                  title="Contact & Send Work Update"
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Update</span>
                                </button>
                              );
                            })()}
                            <button
                              onClick={() => setSelectedProjectId(p.id)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                              title="Audit Timeline Workflow"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500"
                                title="Delete Project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            ) : (
              /* Roadmap Portfolio Gantt & Bottleneck tracker view */
              <div className="space-y-4 animate-fade-in">
                <div className="p-5 rounded-xl border dark:border-slate-800 border-slate-200 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">Project Portfolio Gantt Roadmap</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Visualize project timelines, active phases, and bottleneck warnings across all registered active ventures.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Bottleneck Warning Age:</span>
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border dark:border-slate-700">
                        <input 
                          type="range" 
                          min="3" 
                          max="30" 
                          value={bottleneckThresholdDays}
                          onChange={(e) => setBottleneckThresholdDays(Number(e.target.value))}
                          className="w-20 sm:w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 w-12 text-center">{bottleneckThresholdDays} Days</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[800px] divide-y dark:divide-slate-800 divide-slate-100">
                      {/* Header line */}
                      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 pb-2.5">
                        <div className="col-span-3">Project & Client Info</div>
                        <div className="col-span-1 text-center">Progress</div>
                        <div className="col-span-1 text-center">Active Stage</div>
                        <div className="col-span-6 grid grid-cols-6 text-center border-l dark:border-slate-800 border-slate-100">
                          <div>Phase 1 (W1-2)</div>
                          <div>Phase 2 (W3-4)</div>
                          <div>Phase 3 (W5-6)</div>
                          <div>Phase 4 (W7-8)</div>
                          <div>Phase 5 (W9-10)</div>
                          <div>Status</div>
                        </div>
                        <div className="col-span-1 text-right">Details</div>
                      </div>

                      {/* Project rows */}
                      {filteredProjects.map(p => {
                        const overallPercentage = calculateOverallPercentage(p);
                        const activeStageIndex = STAGES_LIST.indexOf(p.currentStage);
                        
                        // Calculate if there's any critical/warning bottleneck in this project
                        let projectBottleneckCount = 0;
                        let projectCriticalCount = 0;
                        STAGES_LIST.forEach(sName => {
                          const sObj = p.stages?.[sName];
                          if (sObj) {
                            const status = getStageBottleneckStatus(sName, sObj, p);
                            if (status.status === 'Critical') {
                              projectCriticalCount++;
                              projectBottleneckCount++;
                            } else if (status.status === 'Warning') {
                              projectBottleneckCount++;
                            }
                          }
                        });

                        return (
                          <div key={p.id} className="grid grid-cols-12 gap-2 py-3.5 items-center hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                            <div className="col-span-3">
                              <p className="font-bold text-slate-800 dark:text-slate-100 hover:text-emerald-600 cursor-pointer" onClick={() => { setSelectedProjectId(p.id); setViewMode('gantt'); }}>{p.projectName}</p>
                              <span className="text-[10px] text-slate-400 block mt-0.5">ID: {p.id} • Client: {p.customerName}</span>
                            </div>
                            <div className="col-span-1 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {overallPercentage}%
                            </div>
                            <div className="col-span-1 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[9px] font-bold block truncate" title={p.currentStage}>
                                {p.currentStage}
                              </span>
                            </div>
                            <div className="col-span-6 grid grid-cols-6 items-center text-center border-l dark:border-slate-800 border-slate-100 h-full relative">
                              {/* Phase 1 (W1-2) */}
                              <div className="px-1">
                                <div className={`h-2.5 rounded-full ${
                                  activeStageIndex >= 4 ? 'bg-emerald-500' :
                                  activeStageIndex >= 0 ? 'bg-blue-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800'
                                }`} />
                              </div>
                              {/* Phase 2 (W3-4) */}
                              <div className="px-1">
                                <div className={`h-2.5 rounded-full ${
                                  activeStageIndex >= 8 ? 'bg-emerald-500' :
                                  activeStageIndex >= 4 ? 'bg-blue-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800'
                                }`} />
                              </div>
                              {/* Phase 3 (W5-6) */}
                              <div className="px-1">
                                <div className={`h-2.5 rounded-full ${
                                  activeStageIndex >= 12 ? 'bg-emerald-500' :
                                  activeStageIndex >= 8 ? 'bg-blue-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800'
                                }`} />
                              </div>
                              {/* Phase 4 (W7-8) */}
                              <div className="px-1">
                                <div className={`h-2.5 rounded-full ${
                                  activeStageIndex >= 16 ? 'bg-emerald-500' :
                                  activeStageIndex >= 12 ? 'bg-blue-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800'
                                }`} />
                              </div>
                              {/* Phase 5 (W9-10) */}
                              <div className="px-1">
                                <div className={`h-2.5 rounded-full ${
                                  activeStageIndex >= 19 ? 'bg-emerald-500' :
                                  activeStageIndex >= 16 ? 'bg-blue-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800'
                                }`} />
                              </div>
                              {/* Phase Status */}
                              <div className="px-1 flex justify-center">
                                {projectCriticalCount > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 font-bold text-[9px] flex items-center gap-0.5" title={`${projectCriticalCount} Critical Bottlenecks!`}>
                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                    <span>{projectCriticalCount} Critical</span>
                                  </span>
                                ) : projectBottleneckCount > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 font-bold text-[9px]" title={`${projectBottleneckCount} Lagging stages`}>
                                    Lagging ({projectBottleneckCount})
                                  </span>
                                ) : p.currentStage === 'Completed' ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px]">
                                    Finished
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-bold text-[9px]">
                                    Healthy
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="col-span-1 text-right">
                              <button 
                                onClick={() => { setSelectedProjectId(p.id); setViewMode('gantt'); }}
                                className="px-2.5 py-1 text-[10px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                View Gantt
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* General portfolio bottleneck report */}
                <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-950/40 bg-amber-500/5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 shrink-0">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400">Automated Pipeline Auditing</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">The engine continually audits the 20-stage milestone timeline against target completions. Adjust the threshold slider above to recalibrate real-time latency triggers.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400">Critical Path Bottlenecks</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">Red badges highlight active phases stuck past their target date. Delays in 'Bank Application' or 'Material Dispatch' have a downstream cascading effect on civil foundation curing timelines.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400">Proactive Mitigation Dispatch</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">Open a specific project to launch the interactive scheduler, adjust completions directly via visual sliders, and broadcast formatted notification templates straight to clients.</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="p-16 text-center border border-dashed rounded-xl text-slate-400 dark:border-slate-800 text-xs">
              🔍 No projects found matching filter query.
            </div>
          )}
        </div>
      )}

      {/* Start Project Popup dialogue */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 shadow-2xl relative ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4">
              Initiate Customer Project
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Select Customer Relation *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rampur Polyhouse Tomato Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Commencement Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Total Valuation (₹)</label>
                  <input
                    type="number"
                    value={totalValue}
                    onChange={(e) => setTotalValue(Number(e.target.value))}
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Area Under Footprint (Acres)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 1.5"
                  value={areaCovered}
                  onChange={(e) => setAreaCovered(Number(e.target.value))}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className={`px-4 py-2 rounded text-xs font-semibold border ${
                    darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Update & Contact Modal */}
      {isMsgModalOpen && msgTargetCustomer && msgTargetProject && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-400 mb-4 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>Send Project Update & Contact Client</span>
            </h3>

            <div className="space-y-4">
              {/* Recipient Details */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs space-y-1">
                <p><strong className="text-slate-500 dark:text-slate-400">Client Name:</strong> {msgTargetCustomer.name}</p>
                <p><strong className="text-slate-500 dark:text-slate-400">Project Title:</strong> {msgTargetProject.projectName}</p>
                <p><strong className="text-slate-500 dark:text-slate-400">Primary Phone:</strong> {msgTargetCustomer.phone}</p>
                {msgTargetCustomer.whatsapp && (
                  <p><strong className="text-slate-500 dark:text-slate-400">WhatsApp Number:</strong> {msgTargetCustomer.whatsapp}</p>
                )}
                {msgTargetCustomer.email && (
                  <p><strong className="text-slate-500 dark:text-slate-400">Gmail / Email:</strong> {msgTargetCustomer.email}</p>
                )}
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-semibold mb-1">Choose Project Update Template</label>
                <select
                  value={msgTemplate}
                  onChange={(e) => {
                    const t = e.target.value;
                    setMsgTemplate(t);
                    regenerateAndSetMessage(t, msgTargetCustomer, msgTargetProject, selectedPipelineStage, actionRequiredInput);
                  }}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <option value="email_milestone">📧 Standardized Project Milestone Email</option>
                  <option value="email_reminder">📧 Outstanding Checkpoint Reminder Email</option>
                  <option value="stage_update">Stage Status & Completion Update</option>
                  <option value="welcome">Project Commencement Greetings</option>
                  <option value="material">Material Dispatch & Site Setup Notification</option>
                  <option value="milestone">Critical Milestone Completion Request</option>
                  <option value="handover">Final Stage Handover & Auditing Notice</option>
                  <option value="custom">Blank / Custom Message</option>
                </select>
              </div>

              {/* Pipeline Stage Selector Context */}
              <div>
                <label className="block text-xs font-semibold mb-1">Select Pipeline Stage Context</label>
                <select
                  value={selectedPipelineStage}
                  onChange={(e) => {
                    const stage = e.target.value;
                    setSelectedPipelineStage(stage);
                    regenerateAndSetMessage(msgTemplate, msgTargetCustomer, msgTargetProject, stage, actionRequiredInput);
                  }}
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  {STAGES_LIST.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg} {stg === msgTargetProject.currentStage ? '(Active Phase)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  You can send updates or reminders for any of the 20 pipeline stages in the full workflow.
                </p>
              </div>

              {/* Pending Action Input for Reminders */}
              {msgTemplate === 'email_reminder' && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-slate-800/30 dark:border-rose-900/30 space-y-1.5 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-400">
                    Required Client Action Point:
                  </label>
                  <input
                    type="text"
                    value={actionRequiredInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActionRequiredInput(val);
                      regenerateAndSetMessage(msgTemplate, msgTargetCustomer, msgTargetProject, selectedPipelineStage, val);
                    }}
                    placeholder="e.g. Completing the bank application signature"
                    className={`w-full p-2 text-xs rounded border focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700 focus:border-rose-500' : 'bg-white border-slate-200 focus:border-rose-600'
                    }`}
                  />
                </div>
              )}

              {/* Message Content Area */}
              <div>
                <label className="block text-xs font-semibold mb-1">Edit Message Body (Text)</label>
                <textarea
                  rows={4}
                  value={msgContent}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMsgContent(val);
                    setEmailTextBody(val);
                  }}
                  placeholder="Type custom message to send..."
                  className={`w-full p-2 text-xs rounded border focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              {/* HTML Email Live Preview & Copy (rendered when an email template is active) */}
              {(msgTemplate === 'email_milestone' || msgTemplate === 'email_reminder') && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      <span>Standardized HTML Email Preview</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(emailHtmlBody);
                        setCopiedHtml(true);
                        setTimeout(() => setCopiedHtml(false), 2000);
                      }}
                      className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold rounded flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedHtml ? '✓ HTML Copied' : '📋 Copy HTML'}
                    </button>
                  </div>
                  <div 
                    className="p-3 border rounded-lg bg-white overflow-hidden max-h-40 overflow-y-auto shadow-inner text-slate-800 text-left"
                    style={{ colorScheme: 'light' }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: emailHtmlBody }} />
                  </div>
                </div>
              )}

              {/* Dispatch Action Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    const phoneVal = msgTargetCustomer.whatsapp || msgTargetCustomer.phone;
                    const cleanPhone = phoneVal.replace(/[^0-9]/g, '');
                    const finalPhone = (cleanPhone.length === 10) ? `91${cleanPhone}` : cleanPhone;
                    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(msgContent)}`;
                    window.open(url, '_blank');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer animate-pulse-once"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Message</span>
                </button>

                <button
                  disabled={!msgTargetCustomer.email}
                  onClick={() => {
                    if (!msgTargetCustomer.email) return;
                    const isEmailTemplate = msgTemplate === 'email_milestone' || msgTemplate === 'email_reminder';
                    const subject = isEmailTemplate ? emailSubject : `HydroGreen Project Update: ${msgTargetProject.projectName}`;
                    const url = `mailto:${msgTargetCustomer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msgContent)}`;
                    window.location.href = url;
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Email Update</span>
                </button>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t dark:border-slate-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsMsgModalOpen(false); setMsgTargetCustomer(null); setMsgTargetProject(null); }}
                  className={`px-4 py-2 rounded text-xs font-semibold border ${
                    darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Close Dialogue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
