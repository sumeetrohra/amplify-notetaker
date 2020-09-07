import React, { useState, useEffect } from "react";
import { withAuthenticator } from "aws-amplify-react";
import { API, graphqlOperation, Auth } from 'aws-amplify';
import "@aws-amplify/ui/dist/style.css";

import { createNote, deleteNote, updateNote } from './graphql/mutations';
import { listNotes } from './graphql/queries';
import { onCreateNote, onDeleteNote, onUpdateNote } from './graphql/subscriptions';

function App() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [id, setId] = useState();
  const [userId, setUserId] = useState('');

  const getNotes = async () => {
    const notes = await API.graphql(graphqlOperation(listNotes));
    setNotes(notes.data.listNotes.items);
  };

  useEffect(() => {
    Auth.currentAuthenticatedUser().then(data => setUserId(data.username))
    getNotes();

    const createListener = API.graphql(graphqlOperation(onCreateNote, { owner: userId })).subscribe({
      next: noteData => {
        setNotes(prevNotes => [ ...prevNotes, noteData.value.data.onCreateNote ]);
        setId();
        setNewNote('');
      }
    });

    const deleteListener = API.graphql(graphqlOperation(onDeleteNote, { owner: userId })).subscribe({
      next: noteData => {
        const deletedNoteId = noteData.value.data.onDeleteNote.id;
        setNotes(prevNotes => prevNotes.filter((note) => note.id !== deletedNoteId));
      }
    });

    const updateListener = API.graphql(graphqlOperation(onUpdateNote, { owner: userId })).subscribe({
      next: noteData => {
        setId();
        setNewNote('');
        const updatedNote = noteData.value.data.onUpdateNote;
        setNotes(prevNotes => {
          const index = prevNotes.findIndex((note) => note.id === updatedNote.id);
          return [
            ...prevNotes.slice(0, index),
            updatedNote,
            ...prevNotes.slice(index + 1),
          ]
        });
      }
    }, [userId]);


    return () => {
      createListener.unsubscribe();
      deleteListener.unsubscribe();
      updateListener.unsubscribe();
    }
  }, [userId]);

  const hasExistingNote = () => {
    return notes.findIndex((note) => note.id === id) > -1;
  }

  const handleAddNote = (event) => {
    event.preventDefault();
    if (hasExistingNote()) {
      const input = { id, note: newNote };
      API.graphql(graphqlOperation(updateNote, { input }));
    } else if (newNote) {
      const input = { note: newNote };
      API.graphql(graphqlOperation(createNote, { input }));
    }
  };

  const handleDeleteNote = (id) => {
    const input = { id };
    API.graphql(graphqlOperation(deleteNote, { input }));
  };

  const handleSetNote = ({ note, id }) => {
    setNewNote(note);
    setId(id);
  }

  return (
    <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
      <h1 className="code f2-l">Amplify Notetaker</h1>
      <form onSubmit={handleAddNote} className="mb-3">
        <input className="pa2 f4" type="text" placeholder="write your note" value={newNote} onChange={(event) => setNewNote(event.target.value)} />
        <button type="submit" className="pa2 f4">
          {id ? 'Update Note' : 'Add Note'}
        </button>
      </form>

      <div>
        {notes.map((item) => (
          <div key={item.id} className="flex items-center">
            <li onClick={() => handleSetNote(item)} className="list pa1 f3">{item.note}</li>
            <button onClick={() => handleDeleteNote(item.id)} className="bg-transparent bn f4">
              <span>&times;</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true });
