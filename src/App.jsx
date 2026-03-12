import { useState, useEffect } from "react";
import { auth, db, provider } from "./firebase";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";

function App() {

  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const messagesRef = collection(db, "messages");

  // Track login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Listen to messages
  useEffect(() => {
    const q = query(messagesRef, orderBy("createdAt"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  // Google login
  const signIn = async () => {
    await signInWithPopup(auth, provider);
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();

    if (message.trim() === "") return;

    await addDoc(messagesRef, {
      text: message,
      createdAt: serverTimestamp(),
      uid: user.uid,
      photoURL: user.photoURL
    });

    setMessage("");
  };

  // Delete all messages
  const deleteAllMessages = async () => {
    const snapshot = await getDocs(messagesRef);

    const deletions = snapshot.docs.map((msg) =>
      deleteDoc(doc(db, "messages", msg.id))
    );

    await Promise.all(deletions);
  };

  // Detect page reload
  useEffect(() => {

    const handleReload = () => {
      deleteAllMessages();
    };

    window.onbeforeunload = handleReload;

    return () => {
      window.onbeforeunload = null;
    };

  }, []);

  // Logout
  const logout = async () => {
    await deleteAllMessages();
    await signOut(auth);
  };

  return (
    <div className="App">

      {!user ? (

        <div className="login">
          <h2>ShadowTalk</h2>
          <button onClick={signIn}>Enter Secure Chat</button>
        </div>

      ) : (

        <div className="chat">

          <div className="header">
            <h3>ShadowTalk</h3>
            <button onClick={logout}>Logout</button>
          </div>

          <div className="messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={msg.uid === user.uid ? "sent" : "received"}
              >
                <img src={msg.photoURL} width="30" />
                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="input-area">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type message..."
            />

            <button type="submit">
              Send
            </button>
          </form>

        </div>

      )}

    </div>
  );
}

export default App;
