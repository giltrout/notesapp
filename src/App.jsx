import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Image,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { getUrl } from "aws-amplify/storage";
import { uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";

/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

Amplify.configure(outputs);
const client = generateClient({
  authMode: "userPool",
});

export default function App() {
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [noteName, setNoteName] = useState("");
  const [noteDescription, setNoteDescription] = useState("");

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data: notes } = await client.models.Note.list();
    const notesWithImages = await Promise.all(
      notes.map(async (note) => {
        const imageKey = note.image;
        if (note.image) {
          const linkToStorageFile = await getUrl({
            path: ({ identityId }) => `media/${identityId}/${note.image}`,
          });
          return { ...note, imageKey, image: linkToStorageFile.url };
        }
        return { ...note, imageKey };
      })
    );
    setNotes(notesWithImages);
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");

    if (editingNote) {
      const update = {
        id: editingNote.id,
        name: noteName,
        description: noteDescription,
      };

      if (image.size > 0) {
        await uploadData({
          path: ({ identityId }) => `media/${identityId}/${image.name}`,
          data: image,
        }).result;
        update.image = image.name;
      }

      await client.models.Note.update(update);
    } else {
      const { data: newNote } = await client.models.Note.create({
        name: noteName,
        description: noteDescription,
        image: image.name,
      });

      if (image.size > 0 && newNote.image) {
        await uploadData({
          path: ({ identityId }) => `media/${identityId}/${newNote.image}`,
          data: image,
        }).result;
      }
    }

    await fetchNotes();
    setEditingNote(null);
    setNoteName("");
    setNoteDescription("");
    event.target.reset();
  }

  function editNote(note) {
    setEditingNote({ id: note.id, image: note.imageKey });
    setNoteName(note.name);
    setNoteDescription(note.description);
  }

  function cancelEdit() {
    setEditingNote(null);
    setNoteName("");
    setNoteDescription("");
  }

  async function deleteNote({ id }) {
    const toBeDeletedNote = {
      id: id,
    };

    const { data: deletedNote } = await client.models.Note.delete(
      toBeDeletedNote
    );
    console.log(deletedNote);

    fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <Heading level={1}>Sofia and Elena's Notes App</Heading>
          <View
            key={editingNote?.id || "new-note"}
            as="form"
            margin="3rem 0"
            onSubmit={createNote}
          >
            <Flex
              direction="column"
              justifyContent="center"
              gap="2rem"
              padding="2rem"
            >
              <TextField
                name="name"
                value={noteName}
                onChange={(event) => setNoteName(event.target.value)}
                placeholder="Note Name"
                label="Note Name"
                labelHidden
                variation="quiet"
                required
              />
              <TextField
                name="description"
                value={noteDescription}
                onChange={(event) => setNoteDescription(event.target.value)}
                placeholder="Note Description"
                label="Note Description"
                labelHidden
                variation="quiet"
                required
              />
              <View
                name="image"
                as="input"
                type="file"
                alignSelf={"end"}
                accept="image/png, image/jpeg"
              />

              <Button type="submit" variation="primary">
                {editingNote ? "Save Changes" : "Create Note"}
              </Button>
              {editingNote && (
                <Button type="button" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </Flex>
          </View>
          <Divider />
          <Heading level={2}>Current Notes</Heading>
          <Grid
            margin="3rem 0"
            autoFlow="column"
            justifyContent="center"
            gap="2rem"
            alignContent="center"
          >
            {notes.map((note) => (
              <Flex
                key={note.id || note.name}
                direction="column"
                justifyContent="center"
                alignItems="center"
                gap="2rem"
                border="1px solid #ccc"
                padding="2rem"
                borderRadius="5%"
                className="box"
              >
                <View>
                  <Heading level="3">{note.name}</Heading>
                </View>
                <Text fontStyle="italic">{note.description}</Text>
                {note.image && (
                  <Image
                    src={note.image}
                    alt={`visual aid for ${note.name}`}
                    style={{ width: 400 }}
                  />
                )}
                <Button onClick={() => editNote(note)}>Edit note</Button>
                <Button
                  variation="destructive"
                  onClick={() => deleteNote(note)}
                >
                  Delete note
                </Button>
              </Flex>
            ))}
          </Grid>
          <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
    </Authenticator>
  );
}
