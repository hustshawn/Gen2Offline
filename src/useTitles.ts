import {
  MutationKey,
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../amplify/data/resource";

import { v4 as uuidv4 } from "uuid";

const client = generateClient<Schema>();

export const titleKeys = {
  queryKey: ["titles"] as QueryKey,
  addKey: ["addTitle"] as MutationKey,
  deleteKey: ["deleteTitle"] as MutationKey,
};

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
      console.log("running", allPosts);
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
      console.log("data-mutate", data);
      return data;
    },
    onMutate: async (newTitles) => {
      await queryClient.cancelQueries({ queryKey: queryKey });
      const previousTitles = queryClient.getQueryData(queryKey);

      if (previousTitles) {
        queryClient.setQueryData(queryKey, (old: Schema["Post"]["type"][]) => {
          console.log("old", [...old, newTitles]);
          const record = { ...old[0], id: uuidv4(), title: newTitles };
          return [...old, record];
        });
      }
      console.log("new", previousTitles, newTitles);

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
      console.log("data-delete", data);
      return data;
    },
    onMutate: async (deletedTitle) => {
      await queryClient.cancelQueries({ queryKey });
      const previousTitles = queryClient.getQueryData(queryKey);

      if (deletedTitle) {
        queryClient.setQueryData(queryKey, (old: Schema["Post"]["type"][]) => {
          console.log("old", deletedTitle);
          return old.filter((item) => item.id !== deletedTitle);
        });
      }

      return { previousTitles };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    deleteMutation,
    mutation,
    query,
  };
};
