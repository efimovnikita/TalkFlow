import React from 'react';

interface UpdateModalProps {
  onUpdate: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ onUpdate }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Update Available</h2>
          <p className="text-gray-600 mb-6">
            A new version of TalkFlow is ready. Please update now to continue using the app with the latest features and fixes.
          </p>
          <button
            onClick={onUpdate}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg shadow-md active:scale-95 transform"
          >
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
