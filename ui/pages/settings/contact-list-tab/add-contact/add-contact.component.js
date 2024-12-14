import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import TextField from '../../../../components/ui/text-field';
import { CONTACT_LIST_ROUTE } from '../../../../helpers/constants/routes';
import { isValidDomainName } from '../../../../helpers/utils/util';
import DomainInput from '../../../confirmations/send/send-content/add-recipient/domain-input';
import PageContainerFooter from '../../../../components/ui/page-container/page-container-footer';
import {
  isBurnAddress,
  isValidHexAddress,
} from '../../../../../shared/modules/hexstring-utils';
import { INVALID_RECIPIENT_ADDRESS_ERROR } from '../../../confirmations/send/send.constants';
import { DomainInputResolutionCell } from '../../../../components/multichain/pages/send/components';
import { isDuplicateContact } from '../../../../components/app/contact-list/utils';

export default class AddContact extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    addressBook: PropTypes.array,
    internalAccounts: PropTypes.array,
    addToAddressBook: PropTypes.func,
    history: PropTypes.object,
    scanQrCode: PropTypes.func,
    qrCodeData:
      PropTypes.object /* eslint-disable-line react/no-unused-prop-types */,
    qrCodeDetected: PropTypes.func,
    domainResolutions: PropTypes.arrayOf(PropTypes.object),
    domainError: PropTypes.string,
    resetDomainResolution: PropTypes.func,
  };

  state = {
    newName: '',
    selectedAddress: '',
    addressInputError: '',
    nameInputError: '',
    input: '',
  };

  constructor(props) {
    super(props);
    this.dValidate = debounce(this.validate, 500);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.qrCodeData) {
      if (nextProps.qrCodeData.type === 'address') {
        const { domainResolutions } = this.props;
        const scannedAddress =
          nextProps.qrCodeData.values.address.toLowerCase();
        const addresses = [
          ...domainResolutions.map(({ resolvedAddress }) => resolvedAddress),
          this.state.ethAddress,
        ].map((address) => address.toLowerCase());
        if (!addresses.some((address) => address === scannedAddress)) {
          this.setState({ input: scannedAddress });
          this.validate(scannedAddress);
          // Clean up QR code data after handling
          this.props.qrCodeDetected(null);
        }
      }
    }
  }

  validate = (input) => {
    const valid =
      !isBurnAddress(input) &&
      isValidHexAddress(input, { mixedCaseUseChecksum: true });
    const validEnsAddress = isValidDomainName(input);

    if (!validEnsAddress && !valid) {
      this.setState({ addressInputError: INVALID_RECIPIENT_ADDRESS_ERROR });
    } else {
      this.setState({ addressInputError: null });
    }
  };

  onChange = (input) => {
    this.setState({ input });
    this.dValidate(input);
  };

  renderInput() {
    return (
      <DomainInput
        scanQrCode={(_) => {
          this.props.scanQrCode();
        }}
        onChange={this.onChange}
        onPaste={(input) => {
          this.setState({ input });
          this.validate(input);
        }}
        onReset={() => {
          this.props.resetDomainResolution();
          this.setState({ input: '', selectedAddress: '' });
        }}
        userInput={this.state.selectedAddress || this.state.input}
      />
    );
  }

  validateName = (newName) => {
    const { addressBook, internalAccounts } = this.props;
    return !isDuplicateContact(addressBook, internalAccounts, newName);
  };

  handleNameChange = (newName) => {
    const isValidName = this.validateName(newName);

    this.setState({
      nameInputError: isValidName ? null : this.context.t('nameAlreadyInUse'),
    });

    this.setState({ newName });
  };

  render() {
    const { t } = this.context;
    const { history, addToAddressBook, domainError, domainResolutions } =
      this.props;

    const addressError = domainError || this.state.addressInputError;
    const newAddress = this.state.selectedAddress || this.state.input;
    const validAddress =
      !isBurnAddress(newAddress) &&
      isValidHexAddress(newAddress, { mixedCaseUseChecksum: true });

    return (
      <div className="settings-page__content-row address-book__add-contact">
        <div className="address-book__add-contact__content">
          <div className="address-book__view-contact__group address-book__add-contact__content__username">
            <div className="address-book__view-contact__group__label">
              {t('userName')}
            </div>
            <TextField
              type="text"
              id="nickname"
              placeholder={this.context.t('addAlias')}
              value={this.state.newName}
              onChange={(e) => this.handleNameChange(e.target.value)}
              fullWidth
              margin="dense"
              error={this.state.nameInputError}
            />
          </div>

          <div className="address-book__view-contact__group">
            <div className="address-book__view-contact__group__label">
              {t('ethereumPublicAddress')}
            </div>
            {this.renderInput()}
            <div
              className={`address-book__view-contact__group__${
                domainResolutions?.length === 1 ? 'single-' : ''
              }resolution-list`}
            >
              {domainResolutions?.map((resolution) => {
                const {
                  resolvedAddress,
                  resolvingSnap,
                  addressBookEntryName,
                  protocol,
                  domainName,
                } = resolution;
                return (
                  <DomainInputResolutionCell
                    key={`${resolvedAddress}${resolvingSnap}${protocol}`}
                    address={resolvedAddress}
                    domainName={addressBookEntryName ?? domainName}
                    onClick={() => {
                      this.handleNameChange(domainName);
                      this.setState({
                        input: resolvedAddress,
                      });
                      this.props.resetDomainResolution();
                    }}
                    protocol={protocol}
                    resolvingSnap={resolvingSnap}
                  />
                );
              })}
            </div>
            {addressError && (
              <div className="address-book__add-contact__error">
                {t(addressError)}
              </div>
            )}
          </div>
        </div>
        <PageContainerFooter
          cancelText={this.context.t('cancel')}
          disabled={Boolean(
            this.state.addressInputError ||
              this.state.nameInputError ||
              !validAddress ||
              !this.state.newName.trim(),
          )}
          onSubmit={async () => {
            await addToAddressBook(newAddress, this.state.newName);
            history.push(CONTACT_LIST_ROUTE);
          }}
          onCancel={() => {
            history.push(CONTACT_LIST_ROUTE);
          }}
          submitText={this.context.t('save')}
        />
      </div>
    );
  }
}