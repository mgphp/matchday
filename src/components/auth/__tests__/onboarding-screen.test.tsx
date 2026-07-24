import { render, userEvent } from '@testing-library/react-native';

import { OnboardingScreen } from '../onboarding-screen';

describe('OnboardingScreen', () => {
  it('collects coach and club name only when needsCoachProfile is true', async () => {
    const { getByLabelText } = await render(
      <OnboardingScreen needsCoachProfile onSubmit={jest.fn()} />,
    );
    expect(getByLabelText('Your name')).toBeTruthy();
    expect(getByLabelText('Club name')).toBeTruthy();

    const { queryByLabelText: queryTeamOnly } = await render(
      <OnboardingScreen needsCoachProfile={false} onSubmit={jest.fn()} />,
    );
    expect(queryTeamOnly('Your name')).toBeNull();
    expect(queryTeamOnly('Club name')).toBeNull();
  });

  it('submits team-only details when a coach profile already exists', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <OnboardingScreen needsCoachProfile={false} onSubmit={onSubmit} />,
    );

    await userEvent.type(getByLabelText('Team name'), 'Under 10 Bears');
    await userEvent.type(getByLabelText('Team short name (e.g. U10)'), 'U10');
    await userEvent.press(getByText('Continue'));

    expect(onSubmit).toHaveBeenCalledWith({
      coachName: undefined,
      clubName: undefined,
      teamName: 'Under 10 Bears',
      teamShortName: 'U10',
    });
  });
});
