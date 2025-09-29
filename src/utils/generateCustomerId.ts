import { User } from '@/models/user.model';

export const generateUniqueId = async (): Promise<string> => {
	const defaultId = 202500;
	let attempt = 0;

	while (true) {
		const userCount = await User.countDocuments();
		const newIdNumber = defaultId + userCount + attempt;
		const newCustomerId = `U${newIdNumber}`;

		const existingUser = await User.findOne({ customer_id: newCustomerId });

		if (!existingUser) {
			return newCustomerId;
		}

		attempt++;
	}
};
