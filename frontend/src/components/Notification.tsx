import { CheckCircle, XCircle } from "lucide-react";

interface NotificationProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

const Notification = ({ message, type, onClose }: NotificationProps) => {
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg transition-all duration-300 
        ${
          type === "success"
            ? "bg-green-600/90 text-white"
            : "bg-red-600/90 text-white"
        }`}
    >
      <div className="mr-3">
        {type === "success" ? <CheckCircle size={24} /> : <XCircle size={24} />}
      </div>
      <div className="flex-grow">{message}</div>
      <button
        onClick={onClose}
        className="ml-4 hover:bg-white/20 rounded-full p-1"
      >
        ×
      </button>
    </div>
  );
};

export default Notification;
