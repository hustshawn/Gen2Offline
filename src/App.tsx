import "./App.css";
import {
  Button,
  useAuthenticator,
  TextField,
  Heading,
  View,
} from "@aws-amplify/ui-react";
import Post from "./components/Post";
import { useEffect, useState, useCallback, FormEvent } from "react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../amplify/data/resource";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    mutationFn: async (title: string) => {
      const { data } = await client.models.Post.create({
        title,
      });
      console.log("data", data);
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["titles"] });
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await client.models.Post.delete({
        id,
      });
      console.log("data", data);
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["titles"] });
    },
  });

  const client = generateClient<Schema>();
  const { signOut } = useAuthenticator((context) => [context.user]);
  const [posts, setPosts] = useState<Schema["Post"]["type"][]>();
  const [post, setPost] = useState("");

  const getAllData = useCallback(async () => {
    const { data: allPosts } = await client.models.Post.list();

    setPosts(allPosts);
  }, [client.models.Post]);

  useEffect(() => {
    getAllData();
  }, [getAllData]);

  async function onAddTitle(form: FormEvent<HTMLFormElement>) {
    form.preventDefault();
    const title = new FormData(form.currentTarget).get("title") as string;
    if (!title) return;

    mutation.mutate(title);

    // const { data } = await client.models.Post.create({
    //   title,
    // });

    // console.log("data", data);
    // getAllData();
    setPost("");
  }

  async function onDeletePost(id: string) {
    // const { data } = await client.models.Post.delete({
    //   id,
    // });
    deleteMutation.mutate(id);
    // console.log("data", data);
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
