import ErrorView from "@/components/common/ErrorView";
import AddUsersForm from "@/components/users/AddUsersForm";
import EditUsersForm from "@/components/users/EditUserForm";
import service from "@/service";
import { serverSideAuth } from "@/service/serverSideAuth";
import { getUsers, getRoles } from "@/service/user.service";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "api-interface";
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
  const [editingUser, setEditingUser] = useState<
    Exclude<Awaited<ReturnType<typeof getUsers>>["data"], null>[number] | null
  >(null);
  const {
    data: { data: users, error },
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
    initialData: initialUsers,
  });
  const handleDeleteUser = (id: string) =>
    promiseToast(
      service(endpoints.user.deleteUser)({
        param: {
          id,
        },
      })
        .then(() => refetch())
        .catch(handleReqError),
      {
        success: "User deleted",
        error: "Error deleting user",
      }
    );
  if (!users) return <ErrorView error={error} />;
  if (!roles) return <div>Error retrieving roles</div>;
  return (
    <div>
      <AddUsersForm
        refetch={refetch}
        show={isAdding}
        setShow={setIsAdding}
        roles={roles}
      />

      {editingUser && (
        <>
          <input type="checkbox" id="edit-modal" className="modal-toggle" />
          <label htmlFor="edit-modal" className="modal cursor-pointer">
            <label className="modal-box relative" htmlFor="">
              <EditUsersForm
                key={editingUser?.id}
                refetch={refetch}
                roles={roles}
                setUser={setEditingUser}
                user={editingUser}
              />
            </label>
          </label>
        </>
      )}
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
                <td className="flex items-center gap-2">
                  <label
                    onClick={() => setEditingUser(user)}
                    className="btn-secondary btn"
                    htmlFor="edit-modal"
                  >
                    Edit
                  </label>
                  <button
                    className="btn-warning btn"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Delete
                  </button>
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
