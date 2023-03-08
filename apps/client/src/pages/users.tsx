import AddUsersForm from "@/components/users/AddUsersForm";
import { serverSideAuth } from "@/service/serverSideAuth";
import { getUsers, getRoles } from "@/service/user.service";
import { useQuery } from "@tanstack/react-query";
import { GetServerSideProps, NextPage } from "next";
import React, { useState } from "react";

type Props = {
  users: Awaited<ReturnType<typeof getUsers>>;
  roles: Awaited<ReturnType<typeof getRoles>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await serverSideAuth(context);
  if (!("user" in auth.props)) return auth;
  const [users, roles] = await Promise.all([
    getUsers(context),
    getRoles(context),
  ]);
  return { props: { ...auth.props, users, roles } };
};

const UserPage: NextPage<Props> = ({ users: initialUsers, roles }) => {
  const [isAdding, setIsAdding] = useState(false);
  const { data: users, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
    initialData: initialUsers,
  });
  if (!users) return <div>Error retrieving users</div>;
  if (!roles) return <div>Error retrieving roles</div>;
  return (
    <div>
      <AddUsersForm
        refetch={refetch}
        show={isAdding}
        setShow={setIsAdding}
        roles={roles}
      />
      <div className="flex justify-end">
        <button onClick={() => setIsAdding((v) => !v)} className="btn">
          Add User
        </button>
      </div>
      <h1>Users</h1>
      <div className="overflow-x-auto">
        <table className="table-zebra table w-full">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Roles</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>{user.roles.join(", ")}</td>
                <td>
                  <button>Edit</button>
                  <button>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserPage;
