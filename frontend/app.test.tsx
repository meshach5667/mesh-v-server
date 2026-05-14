import { render } from '@testing-library/react-native';
import React from 'react';
import { View, Text } from 'react-native';

describe('App Test', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <View>
        <Text>Hello World</Text>
      </View>
    );
    expect(getByText('Hello World')).toBeTruthy();
  });
});
