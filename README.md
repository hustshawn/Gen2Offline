# Offline-Capable React App with AWS Amplify Gen 2

This application is a simple React-based web app that demonstrates offline capabilities using AWS Amplify Gen 2 and TanStackReact Query. It allows users to add and delete post titles, with the ability to work offline and sync data when the connection is restored.

## Technologies Used

- React
- TypeScript
- AWS Amplify Gen 2
- TanStack React Query
- Tailwind CSS
- Vite

## How It Works

1. Users sign in using AWS Amplify authentication.
2. They can add new post titles using the form at the top of the page.
3. Existing posts are displayed below the form, with the option to delete each post.
4. When offline, users can still add and delete posts. These changes are stored locally.
5. Once the connection is restored, the app automatically syncs the local changes with the server.

## Features

- User authentication using AWS Amplify
- Add and delete post titles
- Offline support for adding and deleting posts
- Data persistence using React Query and local storage
- Responsive design with Tailwind CSS

## Key Components

1. **Authentication**: The app uses AWS Amplify for user authentication, as seen in the `Layout.tsx` file:

```tsx
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Amplify } from "aws-amplify";
import config from "../amplify_outputs.json";

// Configure Amplify with the generated config
Amplify.configure(config);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col ">
      {/* Wrap the entire app with the Authenticator component */}
      <Authenticator>
        <div className="flex-grow">{children}</div>
      </Authenticator>
    </div>
  );
}
```

2. **Main Application**: The core functionality is implemented in `App.tsx`, which includes the form for adding titles and displaying the list of posts:

```tsx
function App() {
  const { signOut } = useAuthenticator((context) => [context.user]);
  const [post, setPost] = useState("");

  const { addKey, deleteKey, queryKey } = titleKeys;

  const { deleteMutation, mutation, query } = useTitles({
    addKey,
    deleteKey,
    queryKey,
  });

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
        Add Post Title
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
```

3. **Data Management**: The app uses React Query for data fetching, caching, and synchronization. The useTitles hook in `useTitles.ts` handles the main data operations:

```tsx
export const useTitles = ({
  queryKey,
  addKey,
  deleteKey,
}: {
  queryKey: QueryKey;
  addKey: MutationKey;
  deleteKey: MutationKey;
}) => {
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: allPosts } = await client.models.Post.list();
      return allPosts;
    },
  });

  const queryClient = useQueryClient();

  // Mutations
  const mutation = useMutation({
    mutationKey: addKey,
    mutationFn: async (title: string) => {
      const { data } = await client.models.Post.create({
        title,
      });
      return data;
    },

    onMutate: async (newTitles) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      const previousTitles = queryClient.getQueryData(queryKey);

      if (previousTitles) {
        queryClient.setQueryData(queryKey, (old: Schema["Post"]["type"][]) => {
          const record = { ...old[0], id: uuidv4(), title: newTitles };
          return [...old, record];
        });
      }

      return { previousTitles };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationKey: deleteKey,
    mutationFn: async (id: string) => {
      const { data } = await client.models.Post.delete({
        id,
      });
      return data;
    },
    onMutate: async (deletedTitle) => {
      await queryClient.cancelQueries({ queryKey });
      const previousTitles = queryClient.getQueryData(queryKey);

      if (deletedTitle) {
        queryClient.setQueryData(queryKey, (old: Schema["Post"]["type"][]) => {
          return old.filter((item) => item.id !== deletedTitle);
        });
      }

      return { previousTitles };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  return {
    deleteMutation,
    mutation,
    query,
  };
};
```

4. **Offline Support**: The application implements offline support using React Query's persistence and mutation capabilities. This is set up in `main.tsx`:

```tsx
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../amplify/data/resource.ts";
import { titleKeys } from "./useTitles.ts";

const { addKey, deleteKey, queryKey } = titleKeys;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 2000,
      retry: 0,
    },
  },
});

const client = generateClient<Schema>();

const asyncStoragePersister = createAsyncStoragePersister({
  storage: window.localStorage,
});

// we need a default mutation function so that paused mutations can resume after a page reload
queryClient.setMutationDefaults(addKey, {
  mutationFn: async (title) => {
    // to avoid clashes with our optimistic update when an offline mutation continues

    await queryClient.cancelQueries({ queryKey });
    const { data } = await client.models.Post.create({
      title,
    });
    return Promise.resolve(data);
  },
});
queryClient.setMutationDefaults(deleteKey, {
  mutationFn: async (id) => {
    // to avoid clashes with our optimistic update when an offline mutation continues

    await queryClient.cancelQueries({ queryKey });
    const { data } = await client.models.Post.delete({
      id,
    });
    return Promise.resolve(data);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
      onSuccess={() => {
        // resume mutations after initial restore from localStorage was successful
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}
    >
      <Layout>
        <App />
      </Layout>
      <ReactQueryDevtools initialIsOpen />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
```

5. **Backend**: The backend is defined using AWS Amplify Gen 2, with the schema and authorization rules specified in `amplify/data/resource.ts`:

```tsx
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Verbiage: a
    .model({
      name: a.string().required(),
    })
    .authorization((allow) => [allow.guest()]),
  Post: a
    .model({
      title: a.string().required(),
      verbiage: a.ref("Verbiage").required().array(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [allow.guest().to(["read"]), allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
```
