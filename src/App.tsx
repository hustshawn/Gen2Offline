import "./App.css";
import {
  Button,
  useAuthenticator,
  TextField,
  Heading,
  View,
} from "@aws-amplify/ui-react";
import Post from "./components/Post";
import { useState, FormEvent } from "react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../amplify/data/resource";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

function App() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["titles"],
    queryFn: async () => {
      const { data: allPosts } = await client.models.Post.list();

      return allPosts;
    },
  });

  // Mutations
  const mutation = useMutation({
    mutationKey: ["addTitles"],
    mutationFn: async (title: string) => {
      const { data } = await client.models.Post.create({
        title,
      });
      console.log("data-mutate", data);
      return data;
    },
    onMutate: async (newTitles) => {
      await queryClient.cancelQueries({ queryKey: ["titles"] });
      const previousTitles = queryClient.getQueryData(["titles"]);

      if (previousTitles) {
        queryClient.setQueryData(
          ["titles"],
          (old: Schema["Post"]["type"][]) => {
            console.log("old", [...old, newTitles]);
            const record = { ...old[0], id: uuidv4(), title: newTitles };
            return [...old, record];
          }
        );
      }
      console.log("new", previousTitles, newTitles);

      return { previousTitles };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["titles"] });
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationKey: ["deleteTitles"],
    mutationFn: async (id: string) => {
      const { data } = await client.models.Post.delete({
        id,
      });
      console.log("data-delete", data);
      return data;
    },
    onMutate: async (deletedTitle) => {
      await queryClient.cancelQueries({ queryKey: ["titles"] });
      const previousTitles = queryClient.getQueryData(["titles"]);

      if (deletedTitle) {
        queryClient.setQueryData(
          ["titles"],
          (old: Schema["Post"]["type"][]) => {
            console.log("old", deletedTitle);
            return old.filter((item) => item.id !== deletedTitle);
          }
        );
      }

      return { previousTitles };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["titles"] });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["titles"] });
    },
  });

  const client = generateClient<Schema>();
  const { signOut } = useAuthenticator((context) => [context.user]);
  const [post, setPost] = useState("");

  async function onAddTitle(form: FormEvent<HTMLFormElement>) {
    form.preventDefault();
    const title = new FormData(form.currentTarget).get("title") as string;
    if (!title) return;

    mutation.mutate(title);

    setPost("");
  }

  async function onDeletePost(id: string) {
    deleteMutation.mutate(id);
  }

  return (
    <View className="flex flex-col w-1/2 m-auto gap-2">
      <Heading level={2} className="text-3xl text-green-400">
        Title Adder
      </Heading>
      <View
        as="form"
        className="flex flex-col w-48 m-auto gap-4"
        onSubmit={onAddTitle}
      >
        <TextField
          label="Title:"
          placeholder="Some title..."
          name="title"
          value={post}
          onChange={(e) => setPost(e.target.value)}
        />

        <Button type="submit" variation="primary">
          Add Title
        </Button>
        {mutation.isPaused || deleteMutation.isPaused ? (
          <View color="red" textAlign="center">
            You are offline! Data will be sent when online.
          </View>
        ) : null}
      </View>
      {query.data?.map((post) => (
        <Post key={post.id} post={post} onDelete={onDeletePost} />
      ))}
      <Button width="10rem" onClick={signOut} variation="warning">
        Sign Out
      </Button>
    </View>
  );
}

export default App;
