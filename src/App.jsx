import { useEffect, useState } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { encryptMessage, decryptMessage } from "./crypto";

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = [];
      for (let doc of snapshot.docs) {
        const data = doc.data();
        const decrypted = await decryptMessage(data.text, data.iv);
        msgs.push({ ...data, text: decrypted });
      }
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const encrypted = await encryptMessage(input);

    await addDoc(collection(db, "messages"), {
      text: encrypted.encrypted,
      iv: encrypted.iv,
      sender: user.displayName,
      createdAt: new Date()
    });

    setInput("");
  };

  const login = async () => {
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="loading">
        <h1>Initializing Secure Channel...</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login">
        <h1>ShadowTalk</h1>
        <button onClick={login}>Enter Secure Chat</button>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="header">
        <h2>ShadowTalk</h2>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.sender === user.displayName ? "myMsg" : "otherMsg"}
          >
            <strong>{msg.sender}</strong>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type encrypted message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
