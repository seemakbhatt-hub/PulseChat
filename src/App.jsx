import { useEffect, useState, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { updateProfile } from "firebase/auth";
import { getAIResponse } from "./gemini";
import { signInWithPopup, signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword} from "firebase/auth";
import { collection, setDoc, onSnapshot, query, orderBy, where, deleteDoc, doc , updateDoc } from "firebase/firestore";
import { encryptMessage, decryptMessage } from "./crypto";
import "./App.css";
import logo from "./mylogo.png";
function App() {

const [user, setUser] = useState(null);
const [messages, setMessages] = useState([]);
const [mode, setMode] = useState("chat");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [isSignup, setIsSignup] = useState(false);
const [username, setUsername] = useState("");
const handleAuth = async () => {
  try {
    if (isSignup && !username.trim()) {
  alert("Username required");
  return;
}
    if (isSignup) {
      const res = await
      createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user,{displayName: username});
   
    
} else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    alert(err.message);
  }
};
const [loginTime, setLoginTime] = useState(null);
const [input, setInput] = useState("");
const [aiMessages, setAiMessages] = useState([]);
const [loading, setLoading] = useState(true);
const [typingUser, setTypingUser] = useState("");
const [onlineUsers, setOnlineUsers] = useState([]);

const messagesEndRef = useRef(null);

// auto scroll to newest message
const scrollToBottom = () => {
messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
};

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (u) => {
    setUser(u);

    if (u) {

      setLoginTime(new Date());

await setDoc(doc(db, "onlineUsers", u.uid), {
  name: u.displayName
});

window.userDocId = u.uid;

  window.addEventListener("beforeunload", async () => {
    try {
      await deleteDoc(doc(db, "onlineUsers", u.uid));
    } catch (err) {
      console.log("Cleanup failed", err);
    }
  });

}

    setLoading(false);
  });

  return () => unsubscribe();
}, []);
useEffect(() => {

  if (!loginTime) return;

  const q = query(
    collection(db, "messages"),
    where("createdAt", ">", loginTime),
    orderBy("createdAt")
  );
const unsubscribe = onSnapshot(q, async (snapshot) => {

  const msgs = [];

  for (let messageDoc of snapshot.docs) {

    const data = messageDoc.data();

    if (user && data.uid !== user.uid && !data.seen) {
      await setDoc(doc(db, "messages", messageDoc.id), {
        ...data,
        seen: true
      });
    }

    const decrypted = await decryptMessage(data.text, data.iv);

    msgs.push({
      id: messageDoc.id,
      ...data,
      text: decrypted
    });

  }

  setMessages(msgs);
  setTimeout(scrollToBottom, 100);

});
  return () => unsubscribe();

}, [loginTime]);
useEffect(() => {

  const q = query(collection(db, "typing"), orderBy("time"));

  const unsubscribe = onSnapshot(q, (snapshot) => {

    snapshot.docChanges().forEach((change) => {

      if (change.type === "added") {

        const name = change.doc.data().name;

        if (name !== user?.displayName) {

          setTypingUser(name);

          setTimeout(() => {
            setTypingUser("");
          }, 2000);

        }

      }

    });

  });

  return () => unsubscribe();

}, [user]);

useEffect(() => {

  const q = query(collection(db, "onlineUsers"));

  const unsubscribe = onSnapshot(q, (snapshot) => {

    const users = snapshot.docs.map(doc => doc.data().name);
    setOnlineUsers(users);

  });

  return () => unsubscribe();

}, []);

const sendMessage = async () => {

if (!input.trim()) return;

const encrypted = await encryptMessage(input);

await setDoc(doc(collection(db, "messages")), {
  text: encrypted.encrypted,
  iv: encrypted.iv,
  name: user.displayName,
  uid: user.uid,
  createdAt: new Date(),
  seen: false,
  reactions: {}
});
 
setInput("");
  await deleteDoc(doc(db, "typing", user.uid));

};
 
const sendAIMessage = async () => {
  if (!input.trim()) return;

  const userMsg = { role: "user", text: input };
  setAiMessages((prev) => [...prev, userMsg]);

  try {
    const reply = await getAIResponse(input);

    const aiMsg = { role: "ai", text: reply };
    setAiMessages((prev) => [...prev, aiMsg]);

  } catch (err) {
    console.log(err);
  }

  setInput("");
};
const reactToMessage = async (messageId, emoji) => {

const messageRef = doc(db, "messages", messageId);

const message = messages.find(m => m.id === messageId);

const updatedReactions = {
  ...(message.reactions || {}),
  [emoji]: true
};

await updateDoc(messageRef, {
  reactions: updatedReactions
});

};
const handleKeyPress = (e) => {
if (e.key === "Enter") {
sendMessage();
}
};

const login = async () => {
await signInWithPopup(auth, provider);
};

const logout = async () => {

  if (window.userDocId) {
    await deleteDoc(doc(db, "onlineUsers", window.userDocId));
  }

  await signOut(auth);

};
if (loading) {
return ( <div className="loading"> <h1>Initializing Secure Channel...</h1> </div>
);
}

if (!user) {
  return (
  <div className="login">

  <h1 className="gradient-title">PulseChat</h1>

  <div className="login-box">
  {isSignup && (
  <input
    type="text"
    placeholder="Enter Username"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
  />
)}

    <input
      type="email"
      placeholder="Enter Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />

    <input
      type="password"
      placeholder="Enter Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />

    <button onClick={handleAuth} className="gradient-btn">
      {isSignup ? "Sign Up" : "Login"}
    </button>

    <p onClick={() => setIsSignup(!isSignup)}>
      {isSignup 
        ? "Already have an account? Login" 
        : "New user? Sign Up"}
    </p>

    <hr />

    <button onClick={login} className="gradient-btn">
      Continue with Google
    </button>

  </div>

</div>
  );
}
return ( <div className="chat-container">
<div className="header">

  <div className="logo-title">
    <img src={logo} className="logo" alt="PulseChat logo"/>
    <span className="gradient-title">PulseChat By Shankzz</span>
  </div>

 <div className="header-buttons">
  <button onClick={() => setMode("ai")} className="ai-btn">
    Chat with AI
  </button>

  <button onClick={() => setMode("chat")} className="ai-btn">
    Normal Chat
  </button>

  <button className="logout-btn" onClick={logout}>
    Logout
  </button>
</div>

</div>
  
{mode === "chat" && (
  <>
    <div className="online-users">
      Online: {onlineUsers.join(", ")}
    </>

    <div className="messages">

 {messages.map((msg, index) => {

  const isMine = msg.uid === user.uid;

  const previousMessage = messages[index - 1];

  const showName = !previousMessage || previousMessage.uid !== msg.uid;

  const newGroup = !previousMessage || previousMessage.uid !== msg.uid;

  return (
<div
  key={msg.id}
  className={`message-row ${isMine ? "sent" : "received"} ${newGroup ? "new-group" : ""}`}
>

  {!isMine && showName && (
    <div className="avatar">
      {msg.name?.charAt(0)}
    </div>
  )}
  <div className="message-content">

    {showName && (
      <div className="message-name">
        {msg.name}
      </div>
    )}

  <div className="message-bubble">

  <div className={`message ${isMine ? "sent" : "received"}`}>
    {msg.text}
  </div>

  <div className="reactions">
    <button onClick={() => reactToMessage(msg.id,"👍")}>👍</button>
    <button onClick={() => reactToMessage(msg.id,"❤️")}>❤️</button>
    <button onClick={() => reactToMessage(msg.id,"🔥")}>🔥</button>
  </div>

  {msg.reactions && (
  <div className="reaction-display">
    {Object.keys(msg.reactions).map((emoji) => (
      <span key={emoji}>{emoji}</span>
    ))}
  </div>
)}

  {msg.createdAt && (
    <div className="timestamp">
      {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })}
    </div>
  )}
</div>

  </div>

</div>
  );

})}

    <div ref={messagesEndRef} />

  </div>

  {typingUser && (
  <div className="typing-indicator">
    {typingUser} is typing...
  </div>
)}
  <div className="input-area">

   <input
  value={input}
  onChange={(e) => {
    setInput(e.target.value);

    setDoc(doc(db, "typing", user.uid), {
  name: user.displayName,
  time: new Date()
});
  }}
  onKeyDown={handleKeyPress}
  placeholder="The Floor is Yours to Type..."
/>

<button className="gradient-btn" 
  onClick={sendMessage}>
Send
</button>
    
  </div>
  
</div>
  )}
  {mode === "ai" && (
  <div className="ai-screen">

    <h2>🤖 AI Chat</h2>

    <div className="messages">
      {aiMessages.map((msg, i) => (
        <div
          key={i}
          className={`message ${msg.role === "user" ? "sent" : "received"}`}
        >
          {msg.text}
        </div>
      ))}
    </div>

    <div className="input-area">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask AI anything..."
      />

      <button onClick={sendAIMessage} className="gradient-btn">
        Send
      </button>
    </div>

  </div>
)}
</div>

);
}

export default App;
