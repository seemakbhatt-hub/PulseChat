import { useEffect, useState, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { collection, setDoc, onSnapshot, query, orderBy, where, deleteDoc, doc } from "firebase/firestore";
import { encryptMessage, decryptMessage } from "./crypto";
import "./App.css";

function App() {

const [user, setUser] = useState(null);
const [messages, setMessages] = useState([]);
const [loginTime, setLoginTime] = useState(null);
const [input, setInput] = useState("");
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
  seen: false
});
setInput("");

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
return ( <div className="login"> <h1>PulseChat</h1> <button onClick={login}>Enter Secure Chat</button> </div>
);
}

return ( <div className="chat-container">
<div className="header">
  <span className="gradient-title">PulseChat By Shankzz</span>
<button className="logout-btn"
onClick={logout}>
Logout
</button>
</div>
  
<div className="online-users">
  Online: {onlineUsers.join(", ")}
</div>
  
  <div className="messages">

 {messages.map((msg, index) => {

  const isMine = msg.uid === user.uid;

  const previousMessage = messages[index - 1];

  const showName = !previousMessage || previousMessage.uid !== msg.uid;

  const newGroup = !previousMessage || previousMessage.uid !== msg.uid;

  return (
<div
  key={index}
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

);
}

export default App;
