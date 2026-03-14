import { ExternalToast, toast as sonnerToast } from "sonner";

// Custom toast wrapper with BeaverCalc styling
export const toast = {
  success: (message: string, options?: ExternalToast) => {
    return sonnerToast.success(message, {
      ...options,
      classNames: {
        toast:
          "glass-advanced border-2 border-neon-green/40 shadow-2xl shadow-neon-green/20",
        title: "text-white font-bold",
        description: "text-gray-300",
        icon: "text-neon-green",
      },
    });
  },

  error: (message: string, options?: ExternalToast) => {
    return sonnerToast.error(message, {
      ...options,
      classNames: {
        toast:
          "glass-advanced border-2 border-red-500/40 shadow-2xl shadow-red-500/20",
        title: "text-white font-bold",
        description: "text-gray-300",
        icon: "text-red-400",
      },
    });
  },

  info: (message: string, options?: ExternalToast) => {
    return sonnerToast.info(message, {
      ...options,
      classNames: {
        toast:
          "glass-advanced border-2 border-neon-cyan/40 shadow-2xl shadow-neon-cyan/20",
        title: "text-white font-bold",
        description: "text-gray-300",
        icon: "text-neon-cyan",
      },
    });
  },

  warning: (message: string, options?: ExternalToast) => {
    return sonnerToast.warning(message, {
      ...options,
      classNames: {
        toast:
          "glass-advanced border-2 border-yellow-500/40 shadow-2xl shadow-yellow-500/20",
        title: "text-white font-bold",
        description: "text-gray-300",
        icon: "text-yellow-400",
      },
    });
  },

  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
  ) => {
    return sonnerToast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
      classNames: {
        toast: "glass-advanced border-2 border-neon-cyan/40 shadow-2xl",
        title: "text-white font-bold",
        description: "text-gray-300",
      },
    });
  },

  custom: (component: React.ReactNode, options?: ExternalToast) => {
    return sonnerToast.custom(component as any, {
      ...options,
      classNames: {
        toast: "glass-advanced border-2 border-white/20 shadow-2xl",
        ...options?.classNames,
      },
    });
  },
};

// Calculator-specific toast helpers
export const calculatorToasts = {
  runStarted: (calculatorName: string) => {
    toast.info(`Running ${calculatorName}...`, {
      description: "This may take a few moments",
      duration: 3000,
    });
  },

  runCompleted: (calculatorName: string) => {
    toast.success(`${calculatorName} completed!`, {
      description: "Results are ready to view",
      duration: 5000,
    });
  },

  runFailed: (calculatorName: string, error?: string) => {
    toast.error(`${calculatorName} failed`, {
      description: error || "An unexpected error occurred",
      duration: 7000,
    });
  },

  savedDraft: () => {
    toast.success("Draft saved", {
      description: "Your work has been saved",
      duration: 3000,
    });
  },

  exportStarted: (format: "PDF" | "DOCX" | "DXF") => {
    toast.info(`Generating ${format}...`, {
      description: "Your file will download shortly",
      duration: 3000,
    });
  },

  exportCompleted: (format: "PDF" | "DOCX" | "DXF") => {
    toast.success(`${format} generated successfully!`, {
      description: "Check your downloads folder",
      duration: 5000,
    });
  },
};

// Project-specific toast helpers
export const projectToasts = {
  created: (projectName: string) => {
    toast.success("Project created!", {
      description: `${projectName} is ready`,
      duration: 4000,
    });
  },

  updated: (projectName: string) => {
    toast.success("Project updated", {
      description: `Changes to ${projectName} saved`,
      duration: 3000,
    });
  },

  deleted: (projectName: string) => {
    toast.success("Project deleted", {
      description: `${projectName} has been removed`,
      duration: 4000,
    });
  },

  archived: (projectName: string) => {
    toast.info("Project archived", {
      description: `${projectName} moved to archive`,
      duration: 3000,
    });
  },
};

export default toast;
