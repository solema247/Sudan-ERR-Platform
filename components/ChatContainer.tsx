import { ReactNode } from 'react';
import Image from 'next/image';

interface ChatContainerProps {
    children: ReactNode;
}

const ChatContainer = ({ children }: ChatContainerProps) => {
    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-green-500 text-white px-4 py-3 flex items-center rounded-t-lg shadow-md">
                <div className="flex items-center space-x-3">
                    {/* Avatar Image */}
                    <Image
                        src="/avatar.JPG" // Path to the avatar image
                        alt="Chatbot Avatar"
                        width={40}
                        height={40}
                        className="rounded-full"
                    />
                    <div>
                        <div className="font-bold text-sm md:text-base">Sudan Emergency Response Rooms Bot</div>
                        <div className="text-xs md:text-sm text-gray-200">Online</div>
                    </div>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" id="chat-box">
                {children}
            </div>

            {/* Input Area */}
            <div className="bg-white p-3 md:p-4 flex items-center space-x-2 border-t shadow-inner">
                <button className="p-2"><i className="fa fa-paperclip text-gray-500"></i></button>
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 p-2 border rounded-full focus:outline-none text-sm md:text-base"
                />
                <button className="p-2 bg-[#25D366] text-white rounded-full transition-transform transform hover:scale-105">
                    <i className="fa fa-paper-plane"></i>
                </button>
            </div>
        </div>
    );
};

export default ChatContainer;
