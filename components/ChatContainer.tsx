import { ReactNode } from 'react';

interface ChatContainerProps {
    children: ReactNode;
}

const ChatContainer = ({ children }: ChatContainerProps) => {
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-[#128C7E] text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200"></div> {/* Placeholder avatar */}
                    <div className="font-bold text-sm md:text-base">Web Chat</div>
                </div>
                <div className="text-xs md:text-sm">Online</div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4" id="chat-box">
                {/* Render each child as a message bubble */}
                {children}
            </div>

            {/* Input Area */}
            <div className="bg-white p-2 md:p-4 flex items-center space-x-2 border-t">
                <button className="p-2"><i className="fa fa-paperclip text-gray-500"></i></button>
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 p-2 border rounded-full focus:outline-none text-sm md:text-base"
                />
                <button className="p-2 bg-[#25D366] text-white rounded-full"><i className="fa fa-paper-plane"></i></button>
            </div>
        </div>
    );
};

export default ChatContainer;
