export const followAddressforDB = async (followData: any) => {
	const response = await fetch(
		`http://127.0.0.1:4000/launchpads/follow`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(followData),
		},
	);
	if (!response.ok) {
		// This will activate the closest `error.js` Error Boundary
		throw new Error("Failed to fetch data");
	}
	console.log(response.status)
	console.log(response.body)
	return response;
};
