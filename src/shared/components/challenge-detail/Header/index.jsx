/* eslint-disable jsx-a11y/click-events-have-key-events */
/**
 * Challenge header component.
 * This component renders all other child components part of the header.
 * Any data massaging needed for a child view should be done here.
 */

import _ from 'lodash';
import moment from 'moment';
import 'moment-duration-format';
import { isMM } from 'utils/challenge';

import PT from 'prop-types';
import React from 'react';
import { DangerButton, PrimaryButton } from 'topcoder-react-ui-kit';
import { Link } from 'topcoder-react-utils';
import { COMPETITION_TRACKS } from 'utils/tc';

import LeftArrow from 'assets/images/arrow-prev.svg';

import ArrowUp from '../../../../assets/images/icon-arrow-up.svg';
import ArrowDown from '../../../../assets/images/icon-arrow-down.svg';

import Prizes from './Prizes';
import ChallengeTags from './ChallengeTags';
import DeadlinesPanel from './DeadlinesPanel';
import TabSelector from './TabSelector';

import style from './style.scss';

/* Holds day and hour range in ms. */
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export default function ChallengeHeader(props) {
  const {
    isLoggedIn,
    challenge,
    challengesUrl,
    checkpoints,
    isRegistered,
    numWinners,
    onSelectorClicked,
    onToggleDeadlines,
    registering,
    registerForChallenge,
    setChallengeListingFilter,
    unregisterFromChallenge,
    unregistering,
    challengeTypesMap,
    selectedView,
    showDeadlineDetail,
    hasFirstPlacement,
    hasThriveArticles,
    hasRecommendedChallenges,
    isMenuOpened,
    submissionEnded,
    mySubmissions,
  } = props;

  const {
    drPoints,
    id: challengeId,
    name,
    pointPrizes,
    events,
    prizeSets,
    reliabilityBonus,
    numOfRegistrants,
    numOfCheckpointSubmissions,
    numOfSubmissions,
    endDate,
    status,
    type,
    track,
  } = challenge;

  const tags = challenge.tags || [];
  const appealsEndDate = endDate;

  const allPhases = challenge.phases || [];
  const { prizes } = prizeSets && prizeSets.length ? prizeSets[0] : [];

  const checkpointPrizes = _.find(prizeSets, { type: 'checkpoint' });
  let numberOfCheckpointsPrizes = 0;
  let topCheckPointPrize = 0;
  if (!_.isEmpty(checkpointPrizes)) {
    numberOfCheckpointsPrizes = checkpointPrizes.prizes.length;
    topCheckPointPrize = checkpointPrizes.prizes[0].value;
  }

  const phases = {};
  if (allPhases) {
    allPhases.forEach((phase) => {
      phases[_.camelCase(phase.name)] = phase;
    });
  }

  let registrationEnded = true;
  const regPhase = phases && phases.registration;
  if (status !== 'Completed' && regPhase) {
    registrationEnded = !regPhase.isOpen;
  }

  const trackLower = track ? track.replace(' ', '-').toLowerCase() : 'design';

  const eventNames = (events || []).map((event => (event.eventName || '').toUpperCase()));

  const miscTags = _.uniq(_.isArray(tags) ? tags : (tags || '').split(', '));

  let bonusType = '';
  if (numberOfCheckpointsPrizes && topCheckPointPrize) {
    bonusType = 'Bonus';
  } else if (reliabilityBonus && reliabilityBonus.toFixed() !== '0') {
    bonusType = 'Reliability Bonus';
  }

  /* userDetails.hasUserSubmittedForReview does not reset to false
   * if the user has deleted all of their submissions, so we have to
   * iterate through all their submissions and ensure that all of them
   * are Deleted
  */
  const hasSubmissions = !_.isEmpty(mySubmissions);

  const nextPhaseArray = allPhases.filter(p => p.isOpen)
    .sort((a, b) => moment(b.scheduledEndDate).diff(a.scheduledEndDate));
  let nextPhase = nextPhaseArray[0];
  if (isRegistered && allPhases[0] && allPhases[0].name === 'Registration') {
    nextPhase = allPhases[1] || {};
  }
  if (!isRegistered && nextPhase.name === 'Submission' && type === 'First2Finish') {
    nextPhase = nextPhaseArray[1] || {};
  }
  const deadlineEnd = moment(nextPhase && nextPhase.scheduledEndDate);
  const currentTime = moment();

  let timeLeft = deadlineEnd.isAfter(currentTime)
    ? deadlineEnd.diff(currentTime) : 0;

  let format;
  if (timeLeft > DAY_MS) format = 'D[d] H[h]';
  else if (timeLeft > HOUR_MS) format = 'H[h] m[min]';
  else format = 'm[min] s[s]';

  timeLeft = moment.duration(timeLeft).format(format);

  let relevantPhases = [];

  if (showDeadlineDetail) {
    relevantPhases = (allPhases || []).filter((phase) => {
      if (phase.name === 'Iterative Review') {
        const end = phase.actualEndDate || phase.scheduledEndDate;
        return moment(end).isAfter(moment());
      }
      const phaseLowerCase = phase.name.toLowerCase();
      if (phaseLowerCase.includes('screening') || phaseLowerCase.includes('specification')) {
        return false;
      }
      if (phaseLowerCase.includes('registration') || phaseLowerCase.includes('checkpoint')
        || phaseLowerCase.includes('submission') || phaseLowerCase.includes('review')) {
        return true;
      }
      return false;
    });

    relevantPhases.sort((a, b) => {
      if (a.name.toLowerCase().includes('registration')) {
        return -1;
      }
      if (b.name.toLowerCase().includes('registration')) {
        return 1;
      }
      return (new Date(a.scheduledEndDate || a.actualEndDate)).getTime()
        - (new Date(b.scheduledEndDate || b.actualEndDate)).getTime();
    });
    if (type === 'First2Finish' && status === 'Completed') {
      const phases2 = allPhases.filter(p => p.name === 'Iterative Review' && !p.isOpen);
      const endPhaseDate = Math.max(...phases2.map(d => new Date(d.scheduledEndDate)));
      relevantPhases = _.filter(relevantPhases, p => (p.name.toLowerCase().includes('registration')
        || new Date(p.scheduledEndDate).getTime() < endPhaseDate));
      relevantPhases.push({
        id: -1,
        name: 'Winners',
        scheduledEndDate: endPhaseDate,
      });
    } else if (relevantPhases.length > 1) {
      const lastPhase = allPhases[allPhases.length - 1];
      const lastPhaseTime = (
        new Date(lastPhase.actualEndDate || lastPhase.scheduledEndDate)
      ).getTime();
      const challengeName = lastPhase.name === 'Iterative Review' ? lastPhase.name : 'Winners';

      const appealsEnd = (new Date(appealsEndDate).getTime());
      if (lastPhaseTime < appealsEnd && lastPhase.name !== 'Review' && lastPhase.name !== 'Approval') {
        relevantPhases.push({
          id: -1,
          name: challengeName,
          scheduledEndDate: appealsEndDate,
        });
      }
    }
  }

  const checkpointCount = checkpoints && checkpoints.numberOfUniqueSubmitters;
  const nextDeadline = nextPhase && nextPhase.name;

  let nextDeadlineMsg;
  switch ((status || '').toLowerCase()) {
    case 'active':
      nextDeadlineMsg = (
        <div styleName="next-deadline">
          Next Deadline:
          {' '}
          {
            <span styleName="deadline-highlighted">
              {nextDeadline || '-'}
            </span>
          }
        </div>
      );
      break;
    case 'completed':
      nextDeadlineMsg = (
        <div styleName="completed">
          The challenge is finished.
        </div>
      );
      break;
    default:
      nextDeadlineMsg = (
        <div>
          Status:
          &zwnj;
          <span styleName="deadline-highlighted">
            {_.upperFirst(_.lowerCase(status))}
          </span>
        </div>
      );
      break;
  }

  // Legacy MMs have a roundId field, but new MMs do not.
  // This is used to disable registration/submission for legacy MMs.
  const isLegacyMM = isMM(challenge) && Boolean(challenge.roundId);

  if (hasFirstPlacement && !_.isEmpty(allPhases)) {
    _.some(allPhases, { phaseType: 'Final Fix', phaseStatus: 'Open' });
  }

  return (
    <div styleName="challenge-outer-container">
      <div styleName="important-detail">
        <div styleName="title-wrapper" aria-hidden={isMenuOpened}>
          <Link to={challengesUrl} aria-label="Back to challenge list">
            <LeftArrow styleName="left-arrow" />
          </Link>
          <div>
            <h1 styleName="challenge-header">
              {name}
            </h1>
            <div styleName="tag-container">
              <ChallengeTags
                track={track}
                challengeType={_.find(challengeTypesMap, { name: type }) || []}
                challengesUrl={challengesUrl}
                events={eventNames}
                technPlatforms={miscTags}
                setChallengeListingFilter={setChallengeListingFilter}
              />
              {(hasRecommendedChallenges || hasThriveArticles) && (
                <div styleName="recommend-container">
                  {hasRecommendedChallenges && (
                    <div
                      styleName="recommend-tag link"
                      role="button"
                      tabIndex={0}
                      onClick={
                        () => {
                          document.getElementById('recommendedActiveChallenges').scrollIntoView();
                        }}
                    >
                      Recommended Challenges
                    </div>
                  )}

                  {hasRecommendedChallenges && hasThriveArticles && (
                    <div styleName="recommend-tag separator" />
                  )}

                  {hasThriveArticles && (
                    <div
                      styleName="recommend-tag link"
                      role="button"
                      tabIndex={0}
                      onClick={
                        () => {
                          document.getElementById('recommendedThriveArticles').scrollIntoView();
                        }}
                    >Recommended THRIVE Articles
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div styleName="prizes-ops-container">
          <div styleName="prizes-outer-container">
            <h2 styleName="prizes-title">
              Key Information
            </h2>
            <Prizes prizes={prizes && prizes.length ? prizes : [0]} pointPrizes={pointPrizes} />
            {
              bonusType ? (
                <div id={`bonus-${trackLower}`} styleName="bonus-div">
                  {
                    bonusType === 'Bonus'
                      ? (
                        <p styleName="bonus-text">
                          <span styleName={`bonus-highlight ${trackLower}-accent-color`}>
                            BONUS:
                            {' '}
                            {numberOfCheckpointsPrizes}
                          </span>
                          &zwnj;
                          CHECKPOINTS AWARDED WORTH
                          &zwnj;
                          <span
                            styleName={`bonus-highlight ${trackLower}-accent-color`}
                          >
                            $
                            {topCheckPointPrize}
                          </span>
                          &zwnj;
                          EACH
                        </p>
                      )
                      : (
                        <p styleName="bonus-text">
                          <span styleName={`bonus-highlight ${trackLower}-accent-color`}>
                            RELIABILITY BONUS: $
                            {reliabilityBonus.toFixed()}
                          </span>
                        </p>
                      )
                  }
                </div>
              ) : null
            }
            {
              drPoints ? (
                <div styleName="bonus-div">
                  <p styleName="bonus-text">
                    <span styleName={`bonus-highlight ${trackLower}-accent-color`}>
                      POINTS:
                      {drPoints}
                    </span>
                  </p>
                </div>
              ) : null
            }
          </div>
          <div styleName="challenge-ops-wrapper">
            <div styleName="challenge-ops-container">
              {isRegistered ? (
                <DangerButton
                  disabled={unregistering || registrationEnded
                  || hasSubmissions || isLegacyMM}
                  forceA
                  onClick={unregisterFromChallenge}
                  theme={{ button: style.challengeAction }}
                >
                  Unregister
                </DangerButton>
              ) : (
                <PrimaryButton
                  disabled={registering || registrationEnded || isLegacyMM}
                  forceA
                  onClick={registerForChallenge}
                  theme={{ button: style.challengeAction }}
                >
                  Register
                </PrimaryButton>
              )}
              <PrimaryButton
                disabled={!isRegistered || unregistering || submissionEnded || isLegacyMM}
                theme={{ button: style.challengeAction }}
                to={`${challengesUrl}/${challengeId}/submit`}
              >
                Submit
              </PrimaryButton>
              {
                track === COMPETITION_TRACKS.DESIGN && isRegistered && !unregistering
                && hasSubmissions && (
                  <PrimaryButton
                    theme={{ button: style.challengeAction }}
                    to={`${challengesUrl}/${challengeId}/my-submissions`}
                  >
                    View Submissions
                  </PrimaryButton>
                )
              }
            </div>
          </div>
        </div>
        <div styleName="deadlines-view">
          <div styleName="deadlines-overview">
            <div styleName="deadlines-overview-text">
              {nextDeadlineMsg}
              {
                (status || '').toLowerCase() === 'active'
                && (
                <div styleName="current-phase">
                  <span styleName="deadline-highlighted">
                    {timeLeft}
                  </span>
                  {' '}
                  until current deadline ends
                </div>
                )
              }
            </div>
            <a
              onClick={onToggleDeadlines}
              onKeyPress={onToggleDeadlines}
              role="button"
              styleName="deadlines-collapser"
              tabIndex={0}
            >
              {showDeadlineDetail
                ? (
                  <span styleName="collapse-text">
                    Hide Deadlines
                    <ArrowDown />
                  </span>
                )
                : (
                  <span styleName="collapse-text">
                    Show Deadlines
                    <ArrowUp />
                  </span>
                )
              }
            </a>
          </div>
          {
            showDeadlineDetail
            && <DeadlinesPanel deadlines={relevantPhases} />
          }
        </div>
        <TabSelector
          isLoggedIn={isLoggedIn}
          challenge={challenge}
          isMM={isMM(challenge)}
          onSelectorClicked={onSelectorClicked}
          trackLower={trackLower}
          selectedView={selectedView}
          numOfRegistrants={numOfRegistrants}
          numWinners={numWinners}
          hasCheckpoints={checkpoints && checkpoints.length > 0}
          numOfSubmissions={numOfSubmissions}
          numOfCheckpointSubmissions={numOfCheckpointSubmissions}
          hasRegistered={isRegistered}
          checkpointCount={checkpointCount}
          mySubmissions={mySubmissions}
        />
      </div>
    </div>
  );
}

ChallengeHeader.defaultProps = {
  isLoggedIn: false,
  checkpoints: {},
  isMenuOpened: false,
  hasThriveArticles: false,
  hasRecommendedChallenges: false,
};

ChallengeHeader.propTypes = {
  isLoggedIn: PT.bool,
  checkpoints: PT.shape(),
  challenge: PT.shape({
    id: PT.string.isRequired,
    type: PT.any,
    track: PT.string,
    drPoints: PT.any,
    name: PT.any,
    pointPrizes: PT.any,
    events: PT.any,
    technologies: PT.any,
    platforms: PT.any,
    tags: PT.any,
    prizes: PT.any,
    reliabilityBonus: PT.any,
    userDetails: PT.any,
    currentPhases: PT.any,
    numOfRegistrants: PT.any,
    numOfCheckpointSubmissions: PT.any,
    numOfSubmissions: PT.any,
    status: PT.any,
    endDate: PT.any,
    phases: PT.any,
    roundId: PT.any,
    prizeSets: PT.any,
  }).isRequired,
  challengesUrl: PT.string.isRequired,
  isRegistered: PT.bool.isRequired,
  hasThriveArticles: PT.bool,
  hasRecommendedChallenges: PT.bool,
  submissionEnded: PT.bool.isRequired,
  numWinners: PT.number.isRequired,
  onSelectorClicked: PT.func.isRequired,
  onToggleDeadlines: PT.func.isRequired,
  registerForChallenge: PT.func.isRequired,
  registering: PT.bool.isRequired,
  selectedView: PT.string.isRequired,
  setChallengeListingFilter: PT.func.isRequired,
  showDeadlineDetail: PT.bool.isRequired,
  unregisterFromChallenge: PT.func.isRequired,
  unregistering: PT.bool.isRequired,
  challengeTypesMap: PT.shape().isRequired,
  hasFirstPlacement: PT.bool.isRequired,
  isMenuOpened: PT.bool,
  mySubmissions: PT.arrayOf(PT.shape()).isRequired,
};
