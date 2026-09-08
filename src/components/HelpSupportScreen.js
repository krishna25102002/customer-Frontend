import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { C } from '../theme';

const HelpSupportScreen = () => {
  const [message, setMessage] = useState('');

  const faqs = [
    {
      question: 'How do I receive payments?',
      answer: 'Payments are transferred to your bank account weekly.',
    },
    {
      question: 'How to update documents?',
      answer: 'Go to Settings → My Documents → Edit & upload.',
    },
    {
      question: 'Trip not showing?',
      answer: 'Check your internet and ensure you are online.',
    },
  ];

  //////////////////////////////////////////////////////////
  // 📞 Actions
  //////////////////////////////////////////////////////////

  const callSupport = () => {
    Linking.openURL('tel:1800123456');
  };

  const emailSupport = () => {
    Linking.openURL('mailto:support@driverapp.com');
  };

  const submitIssue = () => {
    alert('Issue submitted!');
    setMessage('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Help & Support</Text>
      <Text style={styles.subtitle}>We're here for you</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* FAQ Section */}
        <Text style={styles.sectionTitle}>FAQs</Text>

        {faqs.map((item, index) => (
          <View key={index} style={styles.faqCard}>
            <View style={styles.faqTop}>
              <MaterialIcons name="help" size={16} color={C.primary} />
              <Text style={styles.question}>{item.question}</Text>
            </View>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        ))}

        {/* Contact Section */}
        <Text style={styles.sectionTitle}>Contact Support</Text>

        <TouchableOpacity style={styles.contactItem} onPress={callSupport} activeOpacity={0.7}>
          <View style={styles.contactIcon}>
            <MaterialIcons name="phone" size={20} color={C.primary} />
          </View>
          <Text style={styles.contactText}>Call Support</Text>
          <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem} onPress={emailSupport} activeOpacity={0.7}>
          <View style={styles.contactIcon}>
            <MaterialIcons name="email" size={20} color={C.primary} />
          </View>
          <Text style={styles.contactText}>Email Support</Text>
          <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
        </TouchableOpacity>

        {/* Report Issue */}
        <Text style={styles.sectionTitle}>Report an Issue</Text>

        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            placeholder="Describe your issue..."
            placeholderTextColor={C.textMuted}
            multiline
            value={message}
            onChangeText={setMessage}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submitIssue}>
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

//////////////////////////////////////////////////////////
// 🎨 Styles
//////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 16,
    paddingTop: 20,
  },

  title: {
    color: C.text,
    fontSize: 24,
    fontWeight: 'bold',
  },

  subtitle: {
    color: C.textMuted,
    marginBottom: 10,
  },

  sectionTitle: {
    color: C.primary,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 1,
    fontSize: 12,
  },

  //////////////////////////////////
  // FAQ
  //////////////////////////////////

  faqCard: {
    backgroundColor: C.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },

  faqTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  question: {
    color: C.text,
    fontWeight: 'bold',
    marginLeft: 8,
    flexShrink: 1,
  },

  answer: {
    color: C.textSub,
    marginTop: 6,
    marginLeft: 24,
    fontSize: 13,
  },

  //////////////////////////////////
  // Contact
  //////////////////////////////////

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },

  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  contactText: {
    color: C.text,
    flex: 1,
    fontWeight: '600',
  },

  //////////////////////////////////
  // Input
  //////////////////////////////////

  inputBox: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  input: {
    color: C.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  //////////////////////////////////
  // Button
  //////////////////////////////////

  submitBtn: {
    backgroundColor: C.accent,
    padding: 15,
    borderRadius: 26,
    alignItems: 'center',
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default HelpSupportScreen;